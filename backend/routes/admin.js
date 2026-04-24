const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Admin middleware
const adminMiddleware = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get system stats
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [users, diseases, irrigation, harvest, pests, soil, feedback] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query("SELECT COUNT(*) FROM crop_diseases WHERE status != 'deleted'"),
      pool.query("SELECT COUNT(*) FROM irrigation_records WHERE status != 'deleted'"),
      pool.query("SELECT COUNT(*) FROM harvest_predictions WHERE status != 'deleted'"),
      pool.query("SELECT COUNT(*) FROM pest_identifications WHERE status != 'deleted'"),
      pool.query("SELECT COUNT(*) FROM soil_analyses WHERE status != 'deleted'"),
      pool.query('SELECT COUNT(*) FROM feedback')
    ]);

    res.json({
      stats: {
        total_users: parseInt(users.rows[0].count),
        total_diseases: parseInt(diseases.rows[0].count),
        total_irrigation: parseInt(irrigation.rows[0].count),
        total_harvest: parseInt(harvest.rows[0].count),
        total_pests: parseInt(pests.rows[0].count),
        total_soil: parseInt(soil.rows[0].count),
        total_feedback: parseInt(feedback.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// List all users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT id, email, name, role, email_verified, created_at FROM users
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      records: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get audit logs
router.get('/audit-logs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM audit_logs');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT al.*, u.email as user_email, u.name as user_name
       FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      records: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
