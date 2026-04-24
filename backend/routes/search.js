const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Global search across all tables
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchTerm = `%${q.trim()}%`;
    const userId = req.user.id;

    const [diseases, irrigation, harvest, pests, soil] = await Promise.all([
      pool.query(
        `SELECT id, crop_name, disease_name, severity, location, 'crop_disease' as type
         FROM crop_diseases WHERE user_id = $1 AND status != 'deleted'
         AND (crop_name ILIKE $2 OR disease_name ILIKE $2 OR symptoms ILIKE $2 OR location ILIKE $2)
         LIMIT 10`,
        [userId, searchTerm]
      ),
      pool.query(
        `SELECT id, field_name, crop_type, soil_type, 'irrigation' as type
         FROM irrigation_records WHERE user_id = $1 AND status != 'deleted'
         AND (field_name ILIKE $2 OR crop_type ILIKE $2 OR soil_type ILIKE $2)
         LIMIT 10`,
        [userId, searchTerm]
      ),
      pool.query(
        `SELECT id, field_name, crop_type, current_growth_stage, 'harvest' as type
         FROM harvest_predictions WHERE user_id = $1 AND status != 'deleted'
         AND (field_name ILIKE $2 OR crop_type ILIKE $2 OR current_growth_stage ILIKE $2)
         LIMIT 10`,
        [userId, searchTerm]
      ),
      pool.query(
        `SELECT id, pest_name, affected_crop, location, 'pest' as type
         FROM pest_identifications WHERE user_id = $1 AND status != 'deleted'
         AND (pest_name ILIKE $2 OR affected_crop ILIKE $2 OR symptoms ILIKE $2 OR location ILIKE $2)
         LIMIT 10`,
        [userId, searchTerm]
      ),
      pool.query(
        `SELECT id, field_name, sample_location, soil_texture, 'soil' as type
         FROM soil_analyses WHERE user_id = $1 AND status != 'deleted'
         AND (field_name ILIKE $2 OR sample_location ILIKE $2 OR soil_texture ILIKE $2)
         LIMIT 10`,
        [userId, searchTerm]
      )
    ]);

    const results = {
      crop_diseases: diseases.rows,
      irrigation: irrigation.rows,
      harvest: harvest.rows,
      pests: pests.rows,
      soil: soil.rows,
      total: diseases.rows.length + irrigation.rows.length + harvest.rows.length + pests.rows.length + soil.rows.length
    };

    res.json({ results, query: q });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
