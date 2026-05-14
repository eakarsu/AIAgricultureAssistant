const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const openRouterService = require('../services/openRouterService');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Helper: handle validation errors
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  return null;
}

// Helper: persist AI result to ai_results table
async function logAIResult(userId, feature, aiResult, entityType, entityId) {
  try {
    await pool.query(
      `INSERT INTO ai_results (user_id, feature, model, raw_response, parsed_result, confidence_score, tokens_used, success, error_message, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId, feature, aiResult.model,
        typeof aiResult.raw_json === 'object' ? JSON.stringify(aiResult.raw_json) : (aiResult.analysis || aiResult.identification || ''),
        aiResult.raw_json ? JSON.stringify(aiResult.raw_json) : null,
        aiResult.confidence_score || null,
        aiResult.usage?.total_tokens || null,
        aiResult.success !== false,
        aiResult.error || null,
        entityType, entityId
      ]
    );
  } catch (e) {
    console.warn('Failed to log AI result:', e.message);
  }
}

// Get all crop disease records (supports ?page=1&limit=20)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM crop_diseases WHERE user_id = $1 AND status != 'deleted'`,
      [req.user.id]
    );
    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT * FROM crop_diseases
       WHERE user_id = $1 AND status != 'deleted'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json({
      records: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching crop diseases:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single record
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM crop_diseases WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error fetching crop disease:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new record with AI analysis
router.post('/',
  authMiddleware,
  [
    body('crop_name')
      .notEmpty().withMessage('Crop name is required')
      .isLength({ max: 100 }).withMessage('crop_name max 100 chars')
      .trim(),
    body('symptoms')
      .notEmpty().withMessage('Symptoms are required')
      .isLength({ min: 10 }).withMessage('symptoms must be at least 10 chars')
      .isLength({ max: 2000 }).withMessage('symptoms max 2000 chars')
      .trim(),
    body('location')
      .optional()
      .isLength({ max: 200 }).withMessage('location max 200 chars')
      .trim(),
    body('severity')
      .optional()
      .isIn(['mild', 'moderate', 'severe', 'unknown']).withMessage('severity must be mild, moderate, severe, or unknown'),
    body('image_url')
      .optional()
      .isURL().withMessage('image_url must be a valid URL')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { crop_name, symptoms, severity, image_url, location, detected_date } = req.body;

      // Get AI analysis with structured JSON output
      const aiResult = await openRouterService.analyzeCropDisease({ crop_name, symptoms, location });

      const result = await pool.query(
        `INSERT INTO crop_diseases
         (user_id, crop_name, symptoms, severity, image_url, location, detected_date,
          ai_diagnosis, treatment_recommendations, confidence_score, disease_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          req.user.id,
          crop_name,
          symptoms,
          aiResult.severity || severity || 'unknown',
          image_url || null,
          location || null,
          detected_date || new Date(),
          aiResult.analysis,
          aiResult.treatment_recommendations || aiResult.analysis,
          aiResult.success ? (aiResult.confidence_score || 85) : 0,
          aiResult.diagnosis || null
        ]
      );

      const record = result.rows[0];
      await logAIResult(req.user.id, 'crop_disease_analysis', aiResult, 'crop_diseases', record.id);

      res.status(201).json({ record, aiResponse: aiResult });
    } catch (error) {
      console.error('Error creating crop disease record:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update record
router.put('/:id',
  authMiddleware,
  [
    body('crop_name').optional().isLength({ max: 100 }).trim(),
    body('symptoms').optional().isLength({ max: 2000 }).trim(),
    body('location').optional().isLength({ max: 200 }).trim(),
    body('severity').optional().isIn(['mild', 'moderate', 'severe', 'unknown']),
    body('status').optional().isIn(['active', 'resolved', 'monitoring', 'deleted'])
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { crop_name, disease_name, symptoms, severity, image_url, location, detected_date, status } = req.body;

      const result = await pool.query(
        `UPDATE crop_diseases
         SET crop_name = COALESCE($1, crop_name),
             disease_name = COALESCE($2, disease_name),
             symptoms = COALESCE($3, symptoms),
             severity = COALESCE($4, severity),
             image_url = COALESCE($5, image_url),
             location = COALESCE($6, location),
             detected_date = COALESCE($7, detected_date),
             status = COALESCE($8, status)
         WHERE id = $9 AND user_id = $10
         RETURNING *`,
        [crop_name, disease_name, symptoms, severity, image_url, location, detected_date, status, req.params.id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }

      res.json({ record: result.rows[0] });
    } catch (error) {
      console.error('Error updating crop disease:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Re-analyze with AI
router.post('/:id/analyze', authMiddleware, async (req, res) => {
  try {
    const recordResult = await pool.query(
      'SELECT * FROM crop_diseases WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = recordResult.rows[0];
    const aiResult = await openRouterService.analyzeCropDisease({
      crop_name: record.crop_name,
      symptoms: record.symptoms,
      location: record.location
    });

    const updateResult = await pool.query(
      `UPDATE crop_diseases
       SET ai_diagnosis = $1,
           treatment_recommendations = $2,
           confidence_score = $3,
           disease_name = COALESCE($4, disease_name),
           severity = COALESCE($5, severity)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        aiResult.analysis,
        aiResult.treatment_recommendations || aiResult.analysis,
        aiResult.success ? (aiResult.confidence_score || 85) : 0,
        aiResult.diagnosis || null,
        aiResult.severity || null,
        req.params.id,
        req.user.id
      ]
    );

    await logAIResult(req.user.id, 'crop_disease_reanalysis', aiResult, 'crop_diseases', parseInt(req.params.id));

    res.json({ record: updateResult.rows[0], aiResponse: aiResult });
  } catch (error) {
    console.error('Error re-analyzing crop disease:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE crop_diseases SET status = 'deleted' WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ message: 'Record deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting crop disease:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
