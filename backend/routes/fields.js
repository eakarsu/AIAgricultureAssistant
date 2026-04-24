const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all fields
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM field_locations WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ records: result.rows });
  } catch (error) {
    console.error('Error fetching fields:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single field
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM field_locations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }
    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error fetching field:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create field
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, latitude, longitude, area_size, area_unit, crop_type, soil_type, color } = req.body;

    if (!name || !latitude || !longitude) {
      return res.status(400).json({ error: 'Name, latitude, and longitude are required' });
    }

    const result = await pool.query(
      `INSERT INTO field_locations (user_id, name, description, latitude, longitude, area_size, area_unit, crop_type, soil_type, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, name, description, latitude, longitude, area_size, area_unit || 'acres', crop_type, soil_type, color || '#2e7d32']
    );

    res.status(201).json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error creating field:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update field
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, latitude, longitude, area_size, area_unit, crop_type, soil_type, color } = req.body;

    const result = await pool.query(
      `UPDATE field_locations SET
        name = COALESCE($1, name), description = COALESCE($2, description),
        latitude = COALESCE($3, latitude), longitude = COALESCE($4, longitude),
        area_size = COALESCE($5, area_size), area_unit = COALESCE($6, area_unit),
        crop_type = COALESCE($7, crop_type), soil_type = COALESCE($8, soil_type),
        color = COALESCE($9, color)
       WHERE id = $10 AND user_id = $11 RETURNING *`,
      [name, description, latitude, longitude, area_size, area_unit, crop_type, soil_type, color, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error updating field:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete field
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE field_locations SET status = 'deleted' WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    res.json({ message: 'Field deleted', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting field:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
