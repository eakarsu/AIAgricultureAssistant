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
       aiResult.confidence_level || null, aiResult.usage?.total_tokens || null,
       aiResult.success !== false, aiResult.error || null, entityType, entityId]
    );
  } catch (e) { console.warn('Failed to log AI result:', e.message); }
}

// Get all harvest predictions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM harvest_predictions WHERE user_id = $1 AND status != 'deleted'`,
      [req.user.id]
    );
    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT * FROM harvest_predictions
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
    console.error('Error fetching harvest predictions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single record
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM harvest_predictions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error fetching harvest prediction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new prediction with AI
router.post('/',
  authMiddleware,
  [
    body('field_name').notEmpty().withMessage('Field name is required').isLength({ max: 255 }).trim(),
    body('crop_type').notEmpty().withMessage('Crop type is required').isLength({ max: 100 }).trim(),
    body('field_size').optional().isFloat({ min: 0, max: 999999 }).withMessage('field_size must be a positive number'),
    body('field_size_unit').optional().isIn(['acres', 'hectares', 'sqft', 'sqm']),
    body('planting_date').optional().isISO8601().withMessage('planting_date must be a valid date'),
    body('current_growth_stage').optional().isLength({ max: 100 }).trim(),
    body('health_status').optional().isIn(['excellent', 'good', 'fair', 'poor', 'critical']).withMessage('Invalid health status'),
    body('weather_outlook').optional().isLength({ max: 500 }).trim()
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { field_name, crop_type, planting_date, field_size, field_size_unit, current_growth_stage, health_status, weather_outlook } = req.body;

      const aiResult = await openRouterService.predictHarvest({
        field_name, crop_type, planting_date, field_size, field_size_unit,
        current_growth_stage, health_status, weather_outlook
      });

      // Parse risk_factors array to text for DB storage
      const riskFactorsText = Array.isArray(aiResult.risk_factors)
        ? aiResult.risk_factors.join('; ')
        : (aiResult.risk_factors || null);

      const result = await pool.query(
        `INSERT INTO harvest_predictions
         (user_id, field_name, crop_type, planting_date, field_size, field_size_unit,
          current_growth_stage, health_status, weather_outlook, ai_prediction,
          confidence_level, expected_harvest_date, predicted_yield, yield_unit,
          revenue_estimate, risk_factors)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [
          req.user.id, field_name, crop_type, planting_date || null,
          field_size || null, field_size_unit || 'acres',
          current_growth_stage || null, health_status || null, weather_outlook || null,
          aiResult.prediction,
          aiResult.confidence_level || null,
          aiResult.expected_harvest_date || null,
          aiResult.predicted_yield || null,
          aiResult.yield_unit || null,
          aiResult.revenue_estimate_high || null,
          riskFactorsText
        ]
      );

      const record = result.rows[0];
      await logAIResult(req.user.id, 'harvest_prediction', aiResult, 'harvest_predictions', record.id);

      res.status(201).json({ record, aiResponse: aiResult });
    } catch (error) {
      console.error('Error creating harvest prediction:', error);
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
    body('planting_date').optional().isISO8601(),
    body('expected_harvest_date').optional().isISO8601(),
    body('health_status').optional().isIn(['excellent', 'good', 'fair', 'poor', 'critical']),
    body('predicted_yield').optional().isFloat({ min: 0 }),
    body('market_price_estimate').optional().isFloat({ min: 0 }),
    body('revenue_estimate').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['active', 'harvested', 'failed', 'deleted'])
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { field_name, crop_type, planting_date, expected_harvest_date, field_size, field_size_unit, current_growth_stage, health_status, weather_outlook, predicted_yield, yield_unit, market_price_estimate, revenue_estimate, status } = req.body;

      const result = await pool.query(
        `UPDATE harvest_predictions
         SET field_name = COALESCE($1, field_name),
             crop_type = COALESCE($2, crop_type),
             planting_date = COALESCE($3, planting_date),
             expected_harvest_date = COALESCE($4, expected_harvest_date),
             field_size = COALESCE($5, field_size),
             field_size_unit = COALESCE($6, field_size_unit),
             current_growth_stage = COALESCE($7, current_growth_stage),
             health_status = COALESCE($8, health_status),
             weather_outlook = COALESCE($9, weather_outlook),
             predicted_yield = COALESCE($10, predicted_yield),
             yield_unit = COALESCE($11, yield_unit),
             market_price_estimate = COALESCE($12, market_price_estimate),
             revenue_estimate = COALESCE($13, revenue_estimate),
             status = COALESCE($14, status)
         WHERE id = $15 AND user_id = $16
         RETURNING *`,
        [field_name, crop_type, planting_date, expected_harvest_date, field_size, field_size_unit, current_growth_stage, health_status, weather_outlook, predicted_yield, yield_unit, market_price_estimate, revenue_estimate, status, req.params.id, req.user.id]
      );

      if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
      res.json({ record: result.rows[0] });
    } catch (error) {
      console.error('Error updating harvest prediction:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Re-predict with AI
router.post('/:id/predict', authMiddleware, async (req, res) => {
  try {
    const recordResult = await pool.query(
      'SELECT * FROM harvest_predictions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (recordResult.rows.length === 0) return res.status(404).json({ error: 'Record not found' });

    const record = recordResult.rows[0];
    const aiResult = await openRouterService.predictHarvest(record);

    const riskFactorsText = Array.isArray(aiResult.risk_factors)
      ? aiResult.risk_factors.join('; ')
      : (aiResult.risk_factors || null);

    const updateResult = await pool.query(
      `UPDATE harvest_predictions
       SET ai_prediction = $1, confidence_level = COALESCE($2, confidence_level),
           expected_harvest_date = COALESCE($3, expected_harvest_date),
           predicted_yield = COALESCE($4, predicted_yield),
           yield_unit = COALESCE($5, yield_unit),
           revenue_estimate = COALESCE($6, revenue_estimate),
           risk_factors = COALESCE($7, risk_factors)
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [aiResult.prediction, aiResult.confidence_level, aiResult.expected_harvest_date,
       aiResult.predicted_yield, aiResult.yield_unit, aiResult.revenue_estimate_high,
       riskFactorsText, req.params.id, req.user.id]
    );

    await logAIResult(req.user.id, 'harvest_repredict', aiResult, 'harvest_predictions', parseInt(req.params.id));

    res.json({ record: updateResult.rows[0], aiResponse: aiResult });
  } catch (error) {
    console.error('Error re-predicting harvest:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE harvest_predictions SET status = 'deleted' WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting harvest prediction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
