const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const openRouterService = require('../services/openRouterService');

const router = express.Router();

// Get all irrigation records
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM irrigation_records
       WHERE user_id = $1 AND status != 'deleted'
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ records: result.rows });
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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error fetching irrigation record:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new record with AI recommendations
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      field_name,
      crop_type,
      field_size,
      field_size_unit,
      soil_type,
      current_moisture,
      target_moisture,
      weather_condition,
      temperature,
      humidity,
      last_irrigation
    } = req.body;

    if (!field_name) {
      return res.status(400).json({ error: 'Field name is required' });
    }

    // Get AI recommendations
    const aiResult = await openRouterService.optimizeIrrigation({
      field_name,
      crop_type,
      field_size,
      field_size_unit,
      soil_type,
      current_moisture,
      target_moisture,
      weather_condition,
      temperature,
      humidity,
      last_irrigation
    });

    const result = await pool.query(
      `INSERT INTO irrigation_records
       (user_id, field_name, crop_type, field_size, field_size_unit, soil_type,
        current_moisture, target_moisture, weather_condition, temperature, humidity,
        ai_recommendation, last_irrigation, efficiency_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        req.user.id,
        field_name,
        crop_type,
        field_size,
        field_size_unit || 'acres',
        soil_type,
        current_moisture,
        target_moisture,
        weather_condition,
        temperature,
        humidity,
        aiResult.recommendation,
        last_irrigation,
        aiResult.success ? 75 : 0
      ]
    );

    res.status(201).json({
      record: result.rows[0],
      aiResponse: aiResult
    });
  } catch (error) {
    console.error('Error creating irrigation record:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update record
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const {
      field_name,
      crop_type,
      field_size,
      field_size_unit,
      soil_type,
      current_moisture,
      target_moisture,
      weather_condition,
      temperature,
      humidity,
      last_irrigation,
      next_irrigation,
      status
    } = req.body;

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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error updating irrigation record:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Re-analyze with AI
router.post('/:id/optimize', authMiddleware, async (req, res) => {
  try {
    const recordResult = await pool.query(
      'SELECT * FROM irrigation_records WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = recordResult.rows[0];

    // Get new AI recommendations
    const aiResult = await openRouterService.optimizeIrrigation(record);

    // Update record with new recommendations
    const updateResult = await pool.query(
      `UPDATE irrigation_records
       SET ai_recommendation = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [aiResult.recommendation, req.params.id, req.user.id]
    );

    res.json({
      record: updateResult.rows[0],
      aiResponse: aiResult
    });
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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ message: 'Record deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting irrigation record:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
