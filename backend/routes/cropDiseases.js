const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const openRouterService = require('../services/openRouterService');

const router = express.Router();

// Get all crop disease records
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM crop_diseases
       WHERE user_id = $1 AND status != 'deleted'
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ records: result.rows });
  } catch (error) {
    console.error('Error fetching crop diseases:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single record
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM crop_diseases WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error fetching crop disease:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new record with AI analysis
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      crop_name,
      symptoms,
      severity,
      image_url,
      location,
      detected_date
    } = req.body;

    if (!crop_name) {
      return res.status(400).json({ error: 'Crop name is required' });
    }

    // Get AI analysis
    const aiResult = await openRouterService.analyzeCropDisease({
      crop_name,
      symptoms,
      location
    });

    const result = await pool.query(
      `INSERT INTO crop_diseases
       (user_id, crop_name, symptoms, severity, image_url, location, detected_date,
        ai_diagnosis, treatment_recommendations, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.user.id,
        crop_name,
        symptoms,
        severity || 'unknown',
        image_url,
        location,
        detected_date || new Date(),
        aiResult.analysis,
        aiResult.analysis, // Treatment recommendations extracted from analysis
        aiResult.success ? 85 : 0
      ]
    );

    res.status(201).json({
      record: result.rows[0],
      aiResponse: aiResult
    });
  } catch (error) {
    console.error('Error creating crop disease record:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update record
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const {
      crop_name,
      disease_name,
      symptoms,
      severity,
      image_url,
      location,
      detected_date,
      status
    } = req.body;

    const result = await pool.query(
      `UPDATE crop_diseases
       SET crop_name = COALESCE($1, crop_name),
           disease_name = COALESCE($2, disease_name),
           symptoms = COALESCE($3, symptoms),
           severity = COALESCE($4, severity),
           image_url = COALESCE($5, image_url),
           location = COALESCE($6, location),
           detected_date = COALESCE($7, detected_date),
           status = COALESCE($8, status)
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [crop_name, disease_name, symptoms, severity, image_url, location, detected_date, status, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error updating crop disease:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Re-analyze with AI
router.post('/:id/analyze', authMiddleware, async (req, res) => {
  try {
    const recordResult = await pool.query(
      'SELECT * FROM crop_diseases WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = recordResult.rows[0];

    // Get new AI analysis
    const aiResult = await openRouterService.analyzeCropDisease({
      crop_name: record.crop_name,
      symptoms: record.symptoms,
      location: record.location
    });

    // Update record with new analysis
    const updateResult = await pool.query(
      `UPDATE crop_diseases
       SET ai_diagnosis = $1, treatment_recommendations = $2
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [aiResult.analysis, aiResult.analysis, req.params.id, req.user.id]
    );

    res.json({
      record: updateResult.rows[0],
      aiResponse: aiResult
    });
  } catch (error) {
    console.error('Error re-analyzing crop disease:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE crop_diseases SET status = 'deleted' WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ message: 'Record deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting crop disease:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
