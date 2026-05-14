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

// Get all feedback
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM feedback WHERE user_id = $1',
      [req.user.id]
    );
    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT * FROM feedback WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      records: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single feedback
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM feedback WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create feedback
router.post('/',
  authMiddleware,
  [
    body('type').notEmpty().isIn(['bug', 'feature', 'general', 'improvement']).withMessage('Valid feedback type required: bug, feature, general, improvement'),
    body('subject').notEmpty().trim().isLength({ min: 3, max: 255 }).withMessage('Subject is required (3-255 characters)'),
    body('message').notEmpty().trim().isLength({ min: 10, max: 5000 }).withMessage('Message is required (10-5000 characters)'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { type, subject, message, rating } = req.body;

      const result = await pool.query(
        `INSERT INTO feedback (user_id, type, subject, message, rating)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.user.id, type, subject, message, rating || null]
      );

      res.status(201).json({ record: result.rows[0] });
    } catch (error) {
      console.error('Error creating feedback:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update feedback
router.put('/:id',
  authMiddleware,
  [
    body('type').optional().isIn(['bug', 'feature', 'general', 'improvement']),
    body('subject').optional().trim().isLength({ max: 255 }),
    body('message').optional().trim().isLength({ max: 5000 }),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed'])
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { type, subject, message, rating, status } = req.body;

      const result = await pool.query(
        `UPDATE feedback SET
          type = COALESCE($1, type), subject = COALESCE($2, subject),
          message = COALESCE($3, message), rating = COALESCE($4, rating),
          status = COALESCE($5, status)
         WHERE id = $6 AND user_id = $7 RETURNING *`,
        [type, subject, message, rating, status, req.params.id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Feedback not found' });
      }

      res.json({ record: result.rows[0] });
    } catch (error) {
      console.error('Error updating feedback:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete feedback
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM feedback WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ message: 'Feedback deleted', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
