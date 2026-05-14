const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const openRouterService = require('../services/openRouterService');
const { body, validationResult } = require('express-validator');

const router = express.Router();

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  return null;
}

async function logAIResult(userId, feature, aiResult, entityType, entityId) {
  try {
    await pool.query(
      `INSERT INTO ai_results (user_id, feature, model, raw_response, parsed_result, confidence_score, tokens_used, success, error_message, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId, feature, aiResult.model,
        JSON.stringify(aiResult.raw_json || {}),
        aiResult.raw_json ? JSON.stringify(aiResult.raw_json) : null,
        aiResult.health_score || null,
        aiResult.usage?.total_tokens || null,
        aiResult.success !== false,
        aiResult.error || null,
        entityType, entityId
      ]
    );
  } catch (e) { console.warn('Failed to log AI result:', e.message); }
}

// Get all soil analyses (supports ?page=1&limit=20)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM soil_analyses WHERE user_id = $1 AND status != 'deleted'`,
      [req.user.id]
    );
    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT * FROM soil_analyses
       WHERE user_id = $1 AND status != 'deleted'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json({
      records: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching soil analyses:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single record
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM soil_analyses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error fetching soil analysis:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new analysis with AI
router.post('/',
  authMiddleware,
  [
    body('field_name').notEmpty().withMessage('Field name is required').isLength({ max: 255 }).trim(),
    body('sample_location').optional().isLength({ max: 255 }).trim(),
    body('ph_level').optional().isFloat({ min: 0, max: 14 }).withMessage('pH must be between 0 and 14'),
    body('nitrogen_level').optional().isFloat({ min: 0, max: 10000 }).withMessage('Nitrogen must be a positive number'),
    body('phosphorus_level').optional().isFloat({ min: 0, max: 10000 }).withMessage('Phosphorus must be a positive number'),
    body('potassium_level').optional().isFloat({ min: 0, max: 10000 }).withMessage('Potassium must be a positive number'),
    body('organic_matter').optional().isFloat({ min: 0, max: 100 }).withMessage('Organic matter must be 0-100%'),
    body('soil_texture').optional().isIn(['Sandy', 'Sandy Loam', 'Loam', 'Clay Loam', 'Clay', 'Silt Loam', 'Silt', 'Rocky Loam', 'Potting Mix', 'Rich Loam']).withMessage('Invalid soil texture'),
    body('moisture_content').optional().isFloat({ min: 0, max: 100 }).withMessage('Moisture must be 0-100%'),
    body('electrical_conductivity').optional().isFloat({ min: 0 }).withMessage('Electrical conductivity must be positive'),
    body('sample_date').optional().isISO8601().withMessage('sample_date must be a valid date')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const {
        field_name, sample_location, sample_date,
        ph_level, nitrogen_level, phosphorus_level, potassium_level,
        organic_matter, soil_texture, moisture_content, electrical_conductivity
      } = req.body;

      // Get AI analysis with structured JSON output
      const aiResult = await openRouterService.analyzeSoil({
        field_name, sample_location, ph_level, nitrogen_level,
        phosphorus_level, potassium_level, organic_matter,
        soil_texture, moisture_content, electrical_conductivity
      });

      // Serialize array fields for DB storage
      const suitableCropsText = Array.isArray(aiResult.suitable_crops)
        ? aiResult.suitable_crops.join(', ')
        : (aiResult.suitable_crops || null);

      const result = await pool.query(
        `INSERT INTO soil_analyses
         (user_id, field_name, sample_location, sample_date, ph_level, nitrogen_level,
          phosphorus_level, potassium_level, organic_matter, soil_texture,
          moisture_content, electrical_conductivity, ai_analysis, health_score,
          recommendations, suitable_crops, fertilizer_recommendations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING *`,
        [
          req.user.id, field_name, sample_location || null,
          sample_date || new Date(),
          ph_level || null, nitrogen_level || null,
          phosphorus_level || null, potassium_level || null,
          organic_matter || null, soil_texture || null,
          moisture_content || null, electrical_conductivity || null,
          aiResult.analysis,
          aiResult.success ? (aiResult.health_score || 70) : 0,
          aiResult.recommendations || null,
          suitableCropsText,
          aiResult.fertilizer_recommendations || null
        ]
      );

      const record = result.rows[0];
      await logAIResult(req.user.id, 'soil_analysis', aiResult, 'soil_analyses', record.id);

      res.status(201).json({ record, aiResponse: aiResult });
    } catch (error) {
      console.error('Error creating soil analysis:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update record
router.put('/:id',
  authMiddleware,
  [
    body('field_name').optional().isLength({ max: 255 }).trim(),
    body('sample_location').optional().isLength({ max: 255 }).trim(),
    body('sample_date').optional().isISO8601(),
    body('ph_level').optional().isFloat({ min: 0, max: 14 }),
    body('nitrogen_level').optional().isFloat({ min: 0, max: 10000 }),
    body('phosphorus_level').optional().isFloat({ min: 0, max: 10000 }),
    body('potassium_level').optional().isFloat({ min: 0, max: 10000 }),
    body('organic_matter').optional().isFloat({ min: 0, max: 100 }),
    body('soil_texture').optional().isLength({ max: 100 }).trim(),
    body('moisture_content').optional().isFloat({ min: 0, max: 100 }),
    body('electrical_conductivity').optional().isFloat({ min: 0 }),
    body('recommendations').optional().isLength({ max: 2000 }).trim(),
    body('suitable_crops').optional().isLength({ max: 500 }).trim(),
    body('fertilizer_recommendations').optional().isLength({ max: 2000 }).trim(),
    body('status').optional().isIn(['active', 'archived', 'deleted'])
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const {
        field_name, sample_location, sample_date, ph_level, nitrogen_level,
        phosphorus_level, potassium_level, organic_matter, soil_texture,
        moisture_content, electrical_conductivity, recommendations,
        suitable_crops, fertilizer_recommendations, status
      } = req.body;

      const result = await pool.query(
        `UPDATE soil_analyses
         SET field_name = COALESCE($1, field_name),
             sample_location = COALESCE($2, sample_location),
             sample_date = COALESCE($3, sample_date),
             ph_level = COALESCE($4, ph_level),
             nitrogen_level = COALESCE($5, nitrogen_level),
             phosphorus_level = COALESCE($6, phosphorus_level),
             potassium_level = COALESCE($7, potassium_level),
             organic_matter = COALESCE($8, organic_matter),
             soil_texture = COALESCE($9, soil_texture),
             moisture_content = COALESCE($10, moisture_content),
             electrical_conductivity = COALESCE($11, electrical_conductivity),
             recommendations = COALESCE($12, recommendations),
             suitable_crops = COALESCE($13, suitable_crops),
             fertilizer_recommendations = COALESCE($14, fertilizer_recommendations),
             status = COALESCE($15, status)
         WHERE id = $16 AND user_id = $17
         RETURNING *`,
        [field_name, sample_location, sample_date, ph_level, nitrogen_level,
         phosphorus_level, potassium_level, organic_matter, soil_texture,
         moisture_content, electrical_conductivity, recommendations,
         suitable_crops, fertilizer_recommendations, status,
         req.params.id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }

      res.json({ record: result.rows[0] });
    } catch (error) {
      console.error('Error updating soil analysis:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Re-analyze with AI
router.post('/:id/analyze', authMiddleware, async (req, res) => {
  try {
    const recordResult = await pool.query(
      'SELECT * FROM soil_analyses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = recordResult.rows[0];

    // Get new AI analysis
    const aiResult = await openRouterService.analyzeSoil(record);

    const suitableCropsText = Array.isArray(aiResult.suitable_crops)
      ? aiResult.suitable_crops.join(', ')
      : (aiResult.suitable_crops || null);

    // Update all structured fields from AI response
    const updateResult = await pool.query(
      `UPDATE soil_analyses
       SET ai_analysis = $1,
           health_score = COALESCE($2, health_score),
           recommendations = COALESCE($3, recommendations),
           suitable_crops = COALESCE($4, suitable_crops),
           fertilizer_recommendations = COALESCE($5, fertilizer_recommendations)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        aiResult.analysis,
        aiResult.health_score || null,
        aiResult.recommendations || null,
        suitableCropsText,
        aiResult.fertilizer_recommendations || null,
        req.params.id, req.user.id
      ]
    );

    await logAIResult(req.user.id, 'soil_reanalysis', aiResult, 'soil_analyses', parseInt(req.params.id));

    res.json({ record: updateResult.rows[0], aiResponse: aiResult });
  } catch (error) {
    console.error('Error re-analyzing soil:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE soil_analyses SET status = 'deleted' WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ message: 'Record deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting soil analysis:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
