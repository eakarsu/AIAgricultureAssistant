const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  return null;
}

// Get all fields (supports ?page=1&limit=20)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM field_locations WHERE user_id = $1 AND status = 'active'`,
      [req.user.id]
    );
    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT * FROM field_locations WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json({
      records: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
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
router.post('/',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('Field name is required').isLength({ max: 255 }).trim(),
    body('description').optional().isLength({ max: 1000 }).trim(),
    body('latitude').notEmpty().withMessage('Latitude is required').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    body('longitude').notEmpty().withMessage('Longitude is required').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    body('area_size').optional().isFloat({ min: 0, max: 999999 }).withMessage('Area size must be a positive number'),
    body('area_unit').optional().isIn(['acres', 'hectares', 'sqft', 'sqm']).withMessage('Invalid area unit'),
    body('crop_type').optional().isLength({ max: 100 }).trim(),
    body('soil_type').optional().isLength({ max: 100 }).trim(),
    body('color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Color must be a valid hex color (e.g. #2e7d32)')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { name, description, latitude, longitude, area_size, area_unit, crop_type, soil_type, color } = req.body;

      const result = await pool.query(
        `INSERT INTO field_locations (user_id, name, description, latitude, longitude, area_size, area_unit, crop_type, soil_type, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [req.user.id, name, description || null, latitude, longitude, area_size || null, area_unit || 'acres', crop_type || null, soil_type || null, color || '#2e7d32']
      );

      res.status(201).json({ record: result.rows[0] });
    } catch (error) {
      console.error('Error creating field:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update field
router.put('/:id',
  authMiddleware,
  [
    body('name').optional().isLength({ max: 255 }).trim(),
    body('description').optional().isLength({ max: 1000 }).trim(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    body('area_size').optional().isFloat({ min: 0, max: 999999 }),
    body('area_unit').optional().isIn(['acres', 'hectares', 'sqft', 'sqm']),
    body('crop_type').optional().isLength({ max: 100 }).trim(),
    body('soil_type').optional().isLength({ max: 100 }).trim(),
    body('color').optional().matches(/^#[0-9a-fA-F]{6}$/)
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

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
  }
);

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
