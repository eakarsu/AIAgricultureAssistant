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
router.put('/',
  authMiddleware,
  [
    body('theme').optional().isIn(['light', 'dark', 'system']).withMessage('theme must be light, dark, or system'),
    body('language').optional().isIn(['en', 'tr', 'es', 'fr', 'de', 'ar']).withMessage('Invalid language code'),
    body('notifications_enabled').optional().isBoolean().withMessage('notifications_enabled must be boolean'),
    body('email_notifications').optional().isBoolean().withMessage('email_notifications must be boolean'),
    body('units').optional().isIn(['imperial', 'metric']).withMessage('units must be imperial or metric'),
    body('dashboard_layout').optional().isIn(['grid', 'list', 'compact']).withMessage('Invalid dashboard_layout value')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

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
  }
);

module.exports = router;
