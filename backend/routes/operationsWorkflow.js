const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { validateObservation, buildOperationsDraft } = require('../domain/operationsWorkflow');

const router = express.Router();
router.use(authMiddleware);

const decorate=row=>({...row,canEdit:row.status==='draft'&&row.observation_id===null,canDelete:row.status==='draft'&&row.observation_id===null,canApprove:row.observation_id!==null&&!row.is_demo,retainedReason:row.observation_id!==null?'Native observation, decision and approval evidence is retained.':'Planning draft only. A genuine observation is required before the existing approval workflow.'});
const draftBody=value=>{const keys=['field_id','title','task','priority','notes'];if(!value||Object.keys(value).some(key=>!keys.includes(key)))throw Object.assign(Error('Only native planning fields are supported.'),{status:400});if(!Number.isSafeInteger(Number(value.field_id))||Number(value.field_id)<=0||typeof value.title!=='string'||!value.title.trim()||typeof value.task!=='string'||!value.task.trim()||!['low','medium','high'].includes(value.priority)||typeof value.notes!=='string')throw Object.assign(Error('Choose an actual owned field and fill the native planning fields.'),{status:400});return{field_id:Number(value.field_id),title:value.title.trim(),task:value.task.trim(),priority:value.priority,notes:value.notes.trim()};};
router.get('/plans',async(req,res)=>{try{const rows=(await pool.query('SELECT p.* FROM field_operation_plans p LEFT JOIN field_observations o ON o.id=p.observation_id WHERE COALESCE(p.user_id,o.user_id)=$1 ORDER BY p.created_at DESC,p.id DESC LIMIT 100',[req.user.id])).rows;res.json({data:rows.map(decorate)});}catch(_){res.status(503).json({error:'Native operations plans could not be loaded. Retry.'});}});
router.get('/plans/:id',async(req,res)=>{try{const row=(await pool.query('SELECT p.* FROM field_operation_plans p LEFT JOIN field_observations o ON o.id=p.observation_id WHERE p.id=$1 AND COALESCE(p.user_id,o.user_id)=$2',[req.params.id,req.user.id])).rows[0];if(!row)return res.status(404).json({error:'Native plan not found'});res.json({item:decorate(row)});}catch(_){res.status(503).json({error:'Native plan details could not be loaded. Retry.'});}});
router.post('/drafts',async(req,res)=>{try{const input=draftBody(req.body);const field=(await pool.query("SELECT id FROM field_locations WHERE id=$1 AND user_id=$2 AND status='active'",[input.field_id,req.user.id])).rows[0];if(!field)return res.status(404).json({error:'Accessible active field required'});const row=(await pool.query("INSERT INTO field_operation_plans(user_id,field_id,planning_input,ruleset_version,status,decision) VALUES($1,$2,$3,'native-planning-draft-v1','draft',$4) RETURNING *",[req.user.id,input.field_id,input,{status:'draft',planning_only:true,requires_genuine_observation:true,requires_approval:true,automatic_execution:false,actions:[],alerts:[]}])).rows[0];res.status(201).json({item:decorate(row)});}catch(error){res.status(error.status||503).json({error:error.status?error.message:'Native planning draft could not be saved. Retry.'});}});
router.put('/plans/:id/draft',async(req,res)=>{try{const input=draftBody(req.body);const field=(await pool.query("SELECT id FROM field_locations WHERE id=$1 AND user_id=$2 AND status='active'",[input.field_id,req.user.id])).rows[0];if(!field)return res.status(404).json({error:'Accessible active field required'});const row=(await pool.query("UPDATE field_operation_plans SET field_id=$1,planning_input=$2,updated_at=NOW() WHERE id=$3 AND user_id=$4 AND status='draft' AND observation_id IS NULL RETURNING *",[input.field_id,input,req.params.id,req.user.id])).rows[0];if(!row)return res.status(404).json({error:'Owned planning draft not found or native evidence retained'});res.json({item:decorate(row)});}catch(error){res.status(error.status||503).json({error:error.status?error.message:'Native draft could not be edited. Retry.'});}});
router.delete('/plans/:id/draft',async(req,res)=>{try{const row=(await pool.query("DELETE FROM field_operation_plans WHERE id=$1 AND user_id=$2 AND status='draft' AND observation_id IS NULL RETURNING id",[req.params.id,req.user.id])).rows[0];if(!row)return res.status(404).json({error:'Owned planning draft not found or evidence retained'});res.json({deleted:true});}catch(_){res.status(503).json({error:'Native draft could not be deleted. Retry.'});}});

router.post('/observations', async (req, res) => {
  const errors = validateObservation(req.body);
  if (errors.length) return res.status(400).json({ error: 'validation_failed', details: errors });
  const draft = buildOperationsDraft(req.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owned = await client.query('SELECT id FROM field_locations WHERE id=$1 AND user_id=$2 AND status=$3', [req.body.field_id, req.user.id, 'active']);
    if (!owned.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'field_not_found' }); }
    const existing = await client.query(
      `SELECT p.* FROM field_observations o JOIN field_operation_plans p ON p.observation_id=o.id
       WHERE o.user_id=$1 AND o.client_observation_id=$2`,
      [req.user.id, req.body.client_observation_id]
    );
    if (existing.rows.length) { await client.query('ROLLBACK'); return res.status(200).json({ plan: existing.rows[0], idempotent_replay: true }); }
    const observation = await client.query(
      `INSERT INTO field_observations
       (user_id,field_id,client_observation_id,observed_at,source_type,source_ref,captured_offline,metrics,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, req.body.field_id, req.body.client_observation_id, req.body.observed_at, req.body.source.type,
       req.body.source.external_id || null, Boolean(req.body.source.captured_offline), req.body.metrics, req.body.notes || null]
    );
    const plan = await client.query(
      `INSERT INTO field_operation_plans (observation_id,ruleset_version,decision) VALUES ($1,$2,$3) RETURNING *`,
      [observation.rows[0].id, draft.ruleset_version, draft]
    );
    for (const action of draft.actions) await client.query('INSERT INTO field_work_orders (plan_id,action_type,priority) VALUES ($1,$2,$3)', [plan.rows[0].id, action.type, action.priority]);
    for (const alert of draft.alerts) await client.query('INSERT INTO field_operation_alerts (plan_id,code,severity,evidence) VALUES ($1,$2,$3,$4)', [plan.rows[0].id, alert.code, alert.severity, alert.evidence]);
    await client.query('COMMIT');
    res.status(201).json({ observation: observation.rows[0], plan: plan.rows[0], draft, warning: 'No irrigation, chemical, equipment, or field action was executed.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('field operations workflow failed:', error);
    res.status(500).json({ error: 'workflow_failed' });
  } finally { client.release(); }
});

router.post('/plans/:id/approve', async (req, res) => {
  if (!['admin', 'agronomist', 'operator'].includes(req.user.role)) return res.status(403).json({ error: 'approval_role_required' });
  const result = await pool.query(
    `UPDATE field_operation_plans p SET status='approved', approved_by=$1, approved_at=NOW(), updated_at=NOW()
     FROM field_observations o WHERE p.id=$2 AND p.observation_id=o.id AND o.user_id=$1 AND p.status='draft' RETURNING p.*`,
    [req.user.id, req.params.id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'draft_plan_not_found' });
  await pool.query("UPDATE field_work_orders SET status='approved' WHERE plan_id=$1 AND status='proposed'", [req.params.id]);
  res.json({ plan: result.rows[0], warning: 'Approval releases work for scheduling; it does not execute field equipment or apply treatments.' });
});

module.exports = router;
