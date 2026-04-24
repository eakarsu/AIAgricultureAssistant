const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all feedback
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM feedback WHERE user_id = $1',
      [req.user.id]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM feedback WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      records: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
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
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { type, subject, message, rating } = req.body;

    if (!type || !subject || !message) {
      return res.status(400).json({ error: 'Type, subject, and message are required' });
    }

    const result = await pool.query(
      `INSERT INTO feedback (user_id, type, subject, message, rating)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, type, subject, message, rating]
    );

    res.status(201).json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update feedback
router.put('/:id', authMiddleware, async (req, res) => {
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
});

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
