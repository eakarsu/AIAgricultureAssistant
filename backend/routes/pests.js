const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const openRouterService = require('../services/openRouterService');

const router = express.Router();

// Get all pest identifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM pest_identifications
       WHERE user_id = $1 AND status != 'deleted'
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ records: result.rows });
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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error fetching pest identification:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new identification with AI
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      affected_crop,
      symptoms,
      location,
      severity,
      image_url
    } = req.body;

    if (!affected_crop) {
      return res.status(400).json({ error: 'Affected crop is required' });
    }

    // Get AI identification
    const aiResult = await openRouterService.identifyPest({
      affected_crop,
      symptoms,
      location,
      severity
    });

    const result = await pool.query(
      `INSERT INTO pest_identifications
       (user_id, affected_crop, symptoms, location, severity, image_url,
        ai_identification, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user.id,
        affected_crop,
        symptoms,
        location,
        severity,
        image_url,
        aiResult.identification,
        aiResult.success ? 82 : 0
      ]
    );

    res.status(201).json({
      record: result.rows[0],
      aiResponse: aiResult
    });
  } catch (error) {
    console.error('Error creating pest identification:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update record
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const {
      pest_name,
      pest_type,
      affected_crop,
      location,
      severity,
      image_url,
      symptoms,
      treatment_options,
      prevention_measures,
      infestation_level,
      detected_date,
      status
    } = req.body;

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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error updating pest identification:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Re-identify with AI
router.post('/:id/identify', authMiddleware, async (req, res) => {
  try {
    const recordResult = await pool.query(
      'SELECT * FROM pest_identifications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = recordResult.rows[0];

    // Get new AI identification
    const aiResult = await openRouterService.identifyPest(record);

    // Update record with new identification
    const updateResult = await pool.query(
      `UPDATE pest_identifications
       SET ai_identification = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [aiResult.identification, req.params.id, req.user.id]
    );

    res.json({
      record: updateResult.rows[0],
      aiResponse: aiResult
    });
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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ message: 'Record deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting pest identification:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
