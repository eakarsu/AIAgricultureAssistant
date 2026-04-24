const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const openRouterService = require('../services/openRouterService');

const router = express.Router();

// Get all harvest predictions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM harvest_predictions
       WHERE user_id = $1 AND status != 'deleted'
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ records: result.rows });
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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error fetching harvest prediction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new prediction with AI
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      field_name,
      crop_type,
      planting_date,
      field_size,
      field_size_unit,
      current_growth_stage,
      health_status,
      weather_outlook
    } = req.body;

    if (!field_name || !crop_type) {
      return res.status(400).json({ error: 'Field name and crop type are required' });
    }

    // Get AI prediction
    const aiResult = await openRouterService.predictHarvest({
      field_name,
      crop_type,
      planting_date,
      field_size,
      field_size_unit,
      current_growth_stage,
      health_status,
      weather_outlook
    });

    const result = await pool.query(
      `INSERT INTO harvest_predictions
       (user_id, field_name, crop_type, planting_date, field_size, field_size_unit,
        current_growth_stage, health_status, weather_outlook, ai_prediction, confidence_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        req.user.id,
        field_name,
        crop_type,
        planting_date,
        field_size,
        field_size_unit || 'acres',
        current_growth_stage,
        health_status,
        weather_outlook,
        aiResult.prediction,
        aiResult.success ? 80 : 0
      ]
    );

    res.status(201).json({
      record: result.rows[0],
      aiResponse: aiResult
    });
  } catch (error) {
    console.error('Error creating harvest prediction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update record
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const {
      field_name,
      crop_type,
      planting_date,
      expected_harvest_date,
      field_size,
      field_size_unit,
      current_growth_stage,
      health_status,
      weather_outlook,
      predicted_yield,
      yield_unit,
      market_price_estimate,
      revenue_estimate,
      status
    } = req.body;

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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error updating harvest prediction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Re-predict with AI
router.post('/:id/predict', authMiddleware, async (req, res) => {
  try {
    const recordResult = await pool.query(
      'SELECT * FROM harvest_predictions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = recordResult.rows[0];

    // Get new AI prediction
    const aiResult = await openRouterService.predictHarvest(record);

    // Update record with new prediction
    const updateResult = await pool.query(
      `UPDATE harvest_predictions
       SET ai_prediction = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [aiResult.prediction, req.params.id, req.user.id]
    );

    res.json({
      record: updateResult.rows[0],
      aiResponse: aiResult
    });
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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ message: 'Record deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting harvest prediction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
