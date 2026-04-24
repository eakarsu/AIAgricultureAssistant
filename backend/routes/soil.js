const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const openRouterService = require('../services/openRouterService');

const router = express.Router();

// Get all soil analyses
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM soil_analyses
       WHERE user_id = $1 AND status != 'deleted'
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ records: result.rows });
  } catch (error) {
    console.error('Error fetching soil analyses:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single record
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM soil_analyses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error fetching soil analysis:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new analysis with AI
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      field_name,
      sample_location,
      sample_date,
      ph_level,
      nitrogen_level,
      phosphorus_level,
      potassium_level,
      organic_matter,
      soil_texture,
      moisture_content,
      electrical_conductivity
    } = req.body;

    if (!field_name) {
      return res.status(400).json({ error: 'Field name is required' });
    }

    // Get AI analysis
    const aiResult = await openRouterService.analyzeSoil({
      field_name,
      sample_location,
      ph_level,
      nitrogen_level,
      phosphorus_level,
      potassium_level,
      organic_matter,
      soil_texture,
      moisture_content,
      electrical_conductivity
    });

    const result = await pool.query(
      `INSERT INTO soil_analyses
       (user_id, field_name, sample_location, sample_date, ph_level, nitrogen_level,
        phosphorus_level, potassium_level, organic_matter, soil_texture,
        moisture_content, electrical_conductivity, ai_analysis, health_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        req.user.id,
        field_name,
        sample_location,
        sample_date || new Date(),
        ph_level,
        nitrogen_level,
        phosphorus_level,
        potassium_level,
        organic_matter,
        soil_texture,
        moisture_content,
        electrical_conductivity,
        aiResult.analysis,
        aiResult.success ? 78 : 0
      ]
    );

    res.status(201).json({
      record: result.rows[0],
      aiResponse: aiResult
    });
  } catch (error) {
    console.error('Error creating soil analysis:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update record
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const {
      field_name,
      sample_location,
      sample_date,
      ph_level,
      nitrogen_level,
      phosphorus_level,
      potassium_level,
      organic_matter,
      soil_texture,
      moisture_content,
      electrical_conductivity,
      recommendations,
      suitable_crops,
      fertilizer_recommendations,
      status
    } = req.body;

    const result = await pool.query(
      `UPDATE soil_analyses
       SET field_name = COALESCE($1, field_name),
           sample_location = COALESCE($2, sample_location),
           sample_date = COALESCE($3, sample_date),
           ph_level = COALESCE($4, ph_level),
           nitrogen_level = COALESCE($5, nitrogen_level),
           phosphorus_level = COALESCE($6, phosphorus_level),
           potassium_level = COALESCE($7, potassium_level),
           organic_matter = COALESCE($8, organic_matter),
           soil_texture = COALESCE($9, soil_texture),
           moisture_content = COALESCE($10, moisture_content),
           electrical_conductivity = COALESCE($11, electrical_conductivity),
           recommendations = COALESCE($12, recommendations),
           suitable_crops = COALESCE($13, suitable_crops),
           fertilizer_recommendations = COALESCE($14, fertilizer_recommendations),
           status = COALESCE($15, status)
       WHERE id = $16 AND user_id = $17
       RETURNING *`,
      [field_name, sample_location, sample_date, ph_level, nitrogen_level, phosphorus_level, potassium_level, organic_matter, soil_texture, moisture_content, electrical_conductivity, recommendations, suitable_crops, fertilizer_recommendations, status, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error updating soil analysis:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Re-analyze with AI
router.post('/:id/analyze', authMiddleware, async (req, res) => {
  try {
    const recordResult = await pool.query(
      'SELECT * FROM soil_analyses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = recordResult.rows[0];

    // Get new AI analysis
    const aiResult = await openRouterService.analyzeSoil(record);

    // Update record with new analysis
    const updateResult = await pool.query(
      `UPDATE soil_analyses
       SET ai_analysis = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [aiResult.analysis, req.params.id, req.user.id]
    );

    res.json({
      record: updateResult.rows[0],
      aiResponse: aiResult
    });
  } catch (error) {
    console.error('Error re-analyzing soil:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE soil_analyses SET status = 'deleted' WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ message: 'Record deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting soil analysis:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
