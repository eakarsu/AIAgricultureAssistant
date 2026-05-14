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
       aiResult.efficiency_score || null, aiResult.usage?.total_tokens || null,
       aiResult.success !== false, aiResult.error || null, entityType, entityId]
    );
  } catch (e) { console.warn('Failed to log AI result:', e.message); }
}

// Get all irrigation records
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM irrigation_records WHERE user_id = $1 AND status != 'deleted'`,
      [req.user.id]
    );
    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT * FROM irrigation_records
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
    console.error('Error fetching irrigation records:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single record
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM irrigation_records WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error fetching irrigation record:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new record with AI recommendations
router.post('/',
  authMiddleware,
  [
    body('field_name').notEmpty().withMessage('Field name is required').isLength({ max: 255 }).trim(),
    body('crop_type').optional().isLength({ max: 100 }).trim(),
    body('field_size').optional().isFloat({ min: 0, max: 999999 }).withMessage('field_size must be a positive number'),
    body('field_size_unit').optional().isIn(['acres', 'hectares', 'sqft', 'sqm']),
    body('soil_type').optional().isLength({ max: 100 }).trim(),
    body('current_moisture').optional().isFloat({ min: 0, max: 100 }).withMessage('current_moisture must be 0-100'),
    body('target_moisture').optional().isFloat({ min: 0, max: 100 }).withMessage('target_moisture must be 0-100'),
    body('temperature').optional().isFloat({ min: -60, max: 150 }).withMessage('temperature must be a valid value'),
    body('humidity').optional().isFloat({ min: 0, max: 100 }).withMessage('humidity must be 0-100'),
    body('weather_condition').optional().isLength({ max: 100 }).trim(),
    body('last_irrigation').optional().isISO8601().withMessage('last_irrigation must be a valid date')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { field_name, crop_type, field_size, field_size_unit, soil_type, current_moisture, target_moisture, weather_condition, temperature, humidity, last_irrigation } = req.body;

      const aiResult = await openRouterService.optimizeIrrigation({
        field_name, crop_type, field_size, field_size_unit, soil_type,
        current_moisture, target_moisture, weather_condition, temperature, humidity, last_irrigation
      });

      const result = await pool.query(
        `INSERT INTO irrigation_records
         (user_id, field_name, crop_type, field_size, field_size_unit, soil_type,
          current_moisture, target_moisture, weather_condition, temperature, humidity,
          ai_recommendation, last_irrigation, efficiency_score, water_needed, next_irrigation, irrigation_schedule)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING *`,
        [
          req.user.id, field_name, crop_type, field_size, field_size_unit || 'acres',
          soil_type, current_moisture, target_moisture, weather_condition, temperature, humidity,
          aiResult.recommendation,
          last_irrigation || null,
          aiResult.efficiency_score || null,
          aiResult.water_needed_gallons || null,
          aiResult.next_irrigation_date || null,
          aiResult.irrigation_schedule || null
        ]
      );

      const record = result.rows[0];
      await logAIResult(req.user.id, 'irrigation_optimization', aiResult, 'irrigation_records', record.id);

      res.status(201).json({ record, aiResponse: aiResult });
    } catch (error) {
      console.error('Error creating irrigation record:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update record
router.put('/:id',
  authMiddleware,
  [
    body('field_name').optional().isLength({ max: 255 }).trim(),
    body('crop_type').optional().isLength({ max: 100 }).trim(),
    body('field_size').optional().isFloat({ min: 0 }),
    body('current_moisture').optional().isFloat({ min: 0, max: 100 }),
    body('target_moisture').optional().isFloat({ min: 0, max: 100 }),
    body('temperature').optional().isFloat({ min: -60, max: 150 }),
    body('humidity').optional().isFloat({ min: 0, max: 100 }),
    body('status').optional().isIn(['active', 'completed', 'scheduled', 'deleted'])
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { field_name, crop_type, field_size, field_size_unit, soil_type, current_moisture, target_moisture, weather_condition, temperature, humidity, last_irrigation, next_irrigation, status } = req.body;

      const result = await pool.query(
        `UPDATE irrigation_records
         SET field_name = COALESCE($1, field_name),
             crop_type = COALESCE($2, crop_type),
             field_size = COALESCE($3, field_size),
             field_size_unit = COALESCE($4, field_size_unit),
             soil_type = COALESCE($5, soil_type),
             current_moisture = COALESCE($6, current_moisture),
             target_moisture = COALESCE($7, target_moisture),
             weather_condition = COALESCE($8, weather_condition),
             temperature = COALESCE($9, temperature),
             humidity = COALESCE($10, humidity),
             last_irrigation = COALESCE($11, last_irrigation),
             next_irrigation = COALESCE($12, next_irrigation),
             status = COALESCE($13, status)
         WHERE id = $14 AND user_id = $15
         RETURNING *`,
        [field_name, crop_type, field_size, field_size_unit, soil_type, current_moisture, target_moisture, weather_condition, temperature, humidity, last_irrigation, next_irrigation, status, req.params.id, req.user.id]
      );

      if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
      res.json({ record: result.rows[0] });
    } catch (error) {
      console.error('Error updating irrigation record:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Re-optimize with AI
router.post('/:id/optimize', authMiddleware, async (req, res) => {
  try {
    const recordResult = await pool.query(
      'SELECT * FROM irrigation_records WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (recordResult.rows.length === 0) return res.status(404).json({ error: 'Record not found' });

    const record = recordResult.rows[0];
    const aiResult = await openRouterService.optimizeIrrigation(record);

    const updateResult = await pool.query(
      `UPDATE irrigation_records
       SET ai_recommendation = $1, efficiency_score = COALESCE($2, efficiency_score),
           water_needed = COALESCE($3, water_needed), irrigation_schedule = COALESCE($4, irrigation_schedule),
           next_irrigation = COALESCE($5, next_irrigation)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [aiResult.recommendation, aiResult.efficiency_score, aiResult.water_needed_gallons,
       aiResult.irrigation_schedule, aiResult.next_irrigation_date, req.params.id, req.user.id]
    );

    await logAIResult(req.user.id, 'irrigation_reoptimize', aiResult, 'irrigation_records', parseInt(req.params.id));

    res.json({ record: updateResult.rows[0], aiResponse: aiResult });
  } catch (error) {
    console.error('Error re-optimizing irrigation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE irrigation_records SET status = 'deleted' WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting irrigation record:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
