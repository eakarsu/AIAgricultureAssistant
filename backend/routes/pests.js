const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const openRouterService = require('../services/openRouterService');
const { body, validationResult } = require('express-validator');

const router = express.Router();

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  return null;
}

async function logAIResult(userId, feature, aiResult, entityType, entityId) {
  try {
    await pool.query(
      `INSERT INTO ai_results (user_id, feature, model, raw_response, parsed_result, confidence_score, tokens_used, success, error_message, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [userId, feature, aiResult.model, JSON.stringify(aiResult.raw_json || {}),
       aiResult.raw_json ? JSON.stringify(aiResult.raw_json) : null,
       aiResult.confidence_score || null, aiResult.usage?.total_tokens || null,
       aiResult.success !== false, aiResult.error || null, entityType, entityId]
    );
  } catch (e) { console.warn('Failed to log AI result:', e.message); }
}

// Get all pest identifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM pest_identifications WHERE user_id = $1 AND status != 'deleted'`,
      [req.user.id]
    );
    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT * FROM pest_identifications
       WHERE user_id = $1 AND status != 'deleted'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json({
      records: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching pest identifications:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single record
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pest_identifications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error fetching pest identification:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new identification with AI
router.post('/',
  authMiddleware,
  [
    body('affected_crop').notEmpty().withMessage('Affected crop is required').isLength({ max: 255 }).trim(),
    body('symptoms').optional().isLength({ max: 2000 }).trim(),
    body('location').optional().isLength({ max: 200 }).trim(),
    body('severity').optional().isIn(['mild', 'moderate', 'severe', 'critical']).withMessage('severity must be mild, moderate, severe, or critical'),
    body('image_url').optional().isURL().withMessage('image_url must be a valid URL')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { affected_crop, symptoms, location, severity, image_url } = req.body;

      const aiResult = await openRouterService.identifyPest({ affected_crop, symptoms, location, severity });

      const treatmentText = aiResult.treatment_options || (
        Array.isArray(aiResult.chemical_treatments)
          ? aiResult.chemical_treatments.join('; ')
          : null
      );
      const preventionText = aiResult.prevention_measures || null;

      const result = await pool.query(
        `INSERT INTO pest_identifications
         (user_id, affected_crop, symptoms, location, severity, image_url,
          ai_identification, confidence_score, pest_name, pest_type,
          treatment_options, prevention_measures, infestation_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          req.user.id, affected_crop, symptoms || null, location || null,
          aiResult.infestation_level || severity || null,
          image_url || null,
          aiResult.identification,
          aiResult.success ? (aiResult.confidence_score || 82) : 0,
          aiResult.pest_name || null,
          aiResult.pest_type || null,
          treatmentText,
          preventionText,
          aiResult.infestation_level || null
        ]
      );

      const record = result.rows[0];
      await logAIResult(req.user.id, 'pest_identification', aiResult, 'pest_identifications', record.id);

      res.status(201).json({ record, aiResponse: aiResult });
    } catch (error) {
      console.error('Error creating pest identification:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update record
router.put('/:id',
  authMiddleware,
  [
    body('pest_name').optional().isLength({ max: 255 }).trim(),
    body('pest_type').optional().isLength({ max: 100 }).trim(),
    body('affected_crop').optional().isLength({ max: 255 }).trim(),
    body('location').optional().isLength({ max: 200 }).trim(),
    body('severity').optional().isIn(['mild', 'moderate', 'severe', 'critical']),
    body('symptoms').optional().isLength({ max: 2000 }).trim(),
    body('infestation_level').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('status').optional().isIn(['active', 'resolved', 'monitoring', 'deleted'])
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { pest_name, pest_type, affected_crop, location, severity, image_url, symptoms, treatment_options, prevention_measures, infestation_level, detected_date, status } = req.body;

      const result = await pool.query(
        `UPDATE pest_identifications
         SET pest_name = COALESCE($1, pest_name),
             pest_type = COALESCE($2, pest_type),
             affected_crop = COALESCE($3, affected_crop),
             location = COALESCE($4, location),
             severity = COALESCE($5, severity),
             image_url = COALESCE($6, image_url),
             symptoms = COALESCE($7, symptoms),
             treatment_options = COALESCE($8, treatment_options),
             prevention_measures = COALESCE($9, prevention_measures),
             infestation_level = COALESCE($10, infestation_level),
             detected_date = COALESCE($11, detected_date),
             status = COALESCE($12, status)
         WHERE id = $13 AND user_id = $14
         RETURNING *`,
        [pest_name, pest_type, affected_crop, location, severity, image_url, symptoms, treatment_options, prevention_measures, infestation_level, detected_date, status, req.params.id, req.user.id]
      );

      if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
      res.json({ record: result.rows[0] });
    } catch (error) {
      console.error('Error updating pest identification:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Re-identify with AI
router.post('/:id/identify', authMiddleware, async (req, res) => {
  try {
    const recordResult = await pool.query(
      'SELECT * FROM pest_identifications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (recordResult.rows.length === 0) return res.status(404).json({ error: 'Record not found' });

    const record = recordResult.rows[0];
    const aiResult = await openRouterService.identifyPest(record);

    const treatmentText = aiResult.treatment_options || null;

    const updateResult = await pool.query(
      `UPDATE pest_identifications
       SET ai_identification = $1, confidence_score = COALESCE($2, confidence_score),
           pest_name = COALESCE($3, pest_name), pest_type = COALESCE($4, pest_type),
           treatment_options = COALESCE($5, treatment_options),
           prevention_measures = COALESCE($6, prevention_measures),
           infestation_level = COALESCE($7, infestation_level)
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [aiResult.identification, aiResult.confidence_score, aiResult.pest_name, aiResult.pest_type,
       treatmentText, aiResult.prevention_measures, aiResult.infestation_level,
       req.params.id, req.user.id]
    );

    await logAIResult(req.user.id, 'pest_reidentify', aiResult, 'pest_identifications', parseInt(req.params.id));

    res.json({ record: updateResult.rows[0], aiResponse: aiResult });
  } catch (error) {
    console.error('Error re-identifying pest:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE pest_identifications SET status = 'deleted' WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting pest identification:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
