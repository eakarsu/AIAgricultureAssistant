const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { validateObservation, buildOperationsDraft } = require('../domain/operationsWorkflow');

const router = express.Router();
router.use(authMiddleware);

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
