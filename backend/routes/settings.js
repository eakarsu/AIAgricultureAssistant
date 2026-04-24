const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get user settings
router.get('/', authMiddleware, async (req, res) => {
  try {
    let result = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Create default settings
      result = await pool.query(
        `INSERT INTO user_settings (user_id) VALUES ($1) RETURNING *`,
        [req.user.id]
      );
    }

    res.json({ settings: result.rows[0] });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user settings
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { theme, language, notifications_enabled, email_notifications, units, dashboard_layout } = req.body;

    const result = await pool.query(
      `INSERT INTO user_settings (user_id, theme, language, notifications_enabled, email_notifications, units, dashboard_layout)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         theme = COALESCE($2, user_settings.theme),
         language = COALESCE($3, user_settings.language),
         notifications_enabled = COALESCE($4, user_settings.notifications_enabled),
         email_notifications = COALESCE($5, user_settings.email_notifications),
         units = COALESCE($6, user_settings.units),
         dashboard_layout = COALESCE($7, user_settings.dashboard_layout)
       RETURNING *`,
      [req.user.id, theme, language, notifications_enabled, email_notifications, units, dashboard_layout]
    );

    res.json({ settings: result.rows[0] });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
