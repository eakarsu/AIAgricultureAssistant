const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const openRouterService = require('../services/openRouterService');
const { parseAIJson } = require('../services/openRouterService');
const { body, query, validationResult } = require('express-validator');

// Apply AI rate limiter to all routes in this file
router.use(aiLimiter);

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
        userId, feature, aiResult.model || openRouterService.model,
        JSON.stringify(aiResult.raw_json || {}),
        aiResult.raw_json ? JSON.stringify(aiResult.raw_json) : null,
        aiResult.confidence_score || aiResult.confidence_percentage || null,
        aiResult.usage?.total_tokens || null,
        aiResult.success !== false,
        aiResult.error || null,
        entityType, entityId
      ]
    );
  } catch (e) { console.warn('Failed to log AI result:', e.message); }
}

// GET /api/ai/results — AI call history for the current user
router.get('/results',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('feature').optional().isLength({ max: 100 }).trim()
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const feature = req.query.feature || null;

      const whereExtra = feature ? ' AND feature = $3' : '';
      const params = feature ? [req.user.id, limit, feature, offset] : [req.user.id, limit, offset];
      const countParams = feature ? [req.user.id, feature] : [req.user.id];

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM ai_results WHERE user_id = $1${feature ? ' AND feature = $2' : ''}`,
        countParams
      );
      const total = countResult.rows[0].total;

      // Build parameterized query
      let queryText, queryParams;
      if (feature) {
        queryText = `SELECT id, feature, model, confidence_score, tokens_used, success, error_message, entity_type, entity_id, created_at
                     FROM ai_results WHERE user_id = $1 AND feature = $3
                     ORDER BY created_at DESC LIMIT $2 OFFSET $4`;
        queryParams = [req.user.id, limit, feature, offset];
      } else {
        queryText = `SELECT id, feature, model, confidence_score, tokens_used, success, error_message, entity_type, entity_id, created_at
                     FROM ai_results WHERE user_id = $1
                     ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
        queryParams = [req.user.id, limit, offset];
      }

      const result = await pool.query(queryText, queryParams);

      res.json({
        records: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (error) {
      console.error('AI results history error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /api/ai/crop-rotation
// Takes { field_id, history_years: 5 }, recommends next season crop
router.post('/crop-rotation',
  authMiddleware,
  [
    body('field_id').notEmpty().withMessage('field_id is required'),
    body('history_years').optional().isInt({ min: 1, max: 20 }).withMessage('history_years must be 1-20')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { field_id, history_years = 5 } = req.body;

      // Fetch field info
      let fieldInfo = null;
      try {
        const fieldResult = await pool.query(
          'SELECT * FROM field_locations WHERE id = $1 AND user_id = $2',
          [field_id, req.user.id]
        );
        if (fieldResult.rows.length > 0) fieldInfo = fieldResult.rows[0];
      } catch (e) { /* ignore */ }

      // Fetch past crop history from harvest_predictions
      const yearsAgo = new Date();
      yearsAgo.setFullYear(yearsAgo.getFullYear() - history_years);

      let cropHistory = [];
      try {
        const historyResult = await pool.query(
          `SELECT crop_type, planting_date, field_name, health_status, predicted_yield
           FROM harvest_predictions
           WHERE user_id = $1 AND created_at >= $2
           ORDER BY created_at DESC`,
          [req.user.id, yearsAgo]
        );
        cropHistory = historyResult.rows;
      } catch (e) { /* ignore */ }

      const fieldText = fieldInfo
        ? `Field: ${fieldInfo.name}, Soil Type: ${fieldInfo.soil_type || 'Unknown'}, Size: ${fieldInfo.area_size || 'N/A'} ${fieldInfo.area_unit || ''}, Current Crop: ${fieldInfo.crop_type || 'N/A'}`
        : `Field ID: ${field_id}`;

      const historyText = cropHistory.length > 0
        ? cropHistory.map(h => `- Crop: ${h.crop_type}, Planted: ${h.planting_date || 'N/A'}, Health: ${h.health_status || 'N/A'}, Yield: ${h.predicted_yield || 'N/A'}`).join('\n')
        : 'No crop history found.';

      const systemPrompt = `You are a crop science expert specializing in crop rotation planning. Analyze the field's past crops and soil conditions to recommend the optimal next season crop. Consider soil nutrient depletion, disease pressure cycles, and market value. Respond ONLY in JSON with fields: recommended_crop (string), rotation_reasoning (string), soil_depletion_analysis (string), disease_pressure_analysis (string), alternative_crops (array of strings), expected_benefits (array of strings).`;

      const userPrompt = `Field Information:\n${fieldText}\n\nCrop History (last ${history_years} years):\n${historyText}\n\nRecommend the optimal crop for next season.`;

      const aiResponse = await openRouterService.makeRequest(userPrompt, systemPrompt);
      const content = aiResponse.choices?.[0]?.message?.content || '';

      const parsedResult = parseAIJson(content) || { rotation_reasoning: content };

      // Save recommendation
      const saveResult = await pool.query(
        `INSERT INTO crop_recommendations
         (user_id, field_id, recommended_crop, rotation_reasoning, soil_depletion_analysis, disease_pressure_analysis, ai_analysis)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          req.user.id,
          String(field_id),
          parsedResult.recommended_crop || null,
          parsedResult.rotation_reasoning || null,
          parsedResult.soil_depletion_analysis || null,
          parsedResult.disease_pressure_analysis || null,
          content
        ]
      );

      const aiResultForLog = {
        model: openRouterService.model,
        raw_json: parsedResult,
        usage: aiResponse.usage,
        success: true
      };
      await logAIResult(req.user.id, 'crop_rotation', aiResultForLog, 'crop_recommendations', saveResult.rows[0].id);

      res.json({
        recommendation: saveResult.rows[0],
        analysis: parsedResult,
        field_id,
        crop_history_records: cropHistory.length
      });
    } catch (error) {
      console.error('Crop rotation error:', error);
      res.status(500).json({ error: 'Failed to generate crop rotation recommendation', details: error.message });
    }
  }
);

// POST /api/ai/yield-prediction
// Takes { field_id, crop_type, season }, predicts next harvest yield
router.post('/yield-prediction',
  authMiddleware,
  [
    body('field_id').notEmpty().withMessage('field_id is required'),
    body('crop_type').notEmpty().withMessage('crop_type is required').isLength({ max: 100 }),
    body('season').notEmpty().withMessage('season is required').isLength({ max: 50 })
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { field_id, crop_type, season } = req.body;

      // Fetch field info
      let fieldInfo = null;
      try {
        const fieldResult = await pool.query(
          'SELECT * FROM field_locations WHERE id = $1 AND user_id = $2',
          [field_id, req.user.id]
        );
        if (fieldResult.rows.length > 0) fieldInfo = fieldResult.rows[0];
      } catch (e) { /* ignore */ }

      // Fetch historical yield data for this crop
      let historicalData = [];
      try {
        const histResult = await pool.query(
          `SELECT crop_type, planting_date, expected_harvest_date, predicted_yield, yield_unit,
                  health_status, weather_outlook, field_size, field_size_unit, confidence_level
           FROM harvest_predictions
           WHERE user_id = $1 AND crop_type ILIKE $2
           ORDER BY created_at DESC
           LIMIT 10`,
          [req.user.id, `%${crop_type}%`]
        );
        historicalData = histResult.rows;
      } catch (e) { /* ignore */ }

      const fieldText = fieldInfo
        ? `Field: ${fieldInfo.name}, Soil: ${fieldInfo.soil_type || 'Unknown'}, Size: ${fieldInfo.area_size || 'N/A'} ${fieldInfo.area_unit || ''}`
        : `Field ID: ${field_id}`;

      const historyText = historicalData.length > 0
        ? historicalData.map(h => `- Yield: ${h.predicted_yield || 'N/A'} ${h.yield_unit || ''}, Health: ${h.health_status || 'N/A'}, Season: ${h.planting_date || 'N/A'}`).join('\n')
        : 'No historical yield data found.';

      const systemPrompt = `You are an agricultural yield prediction expert. Analyze field conditions and historical data to predict next harvest yield with confidence ranges. Respond ONLY in JSON with fields: predicted_yield_low (number), predicted_yield_high (number), predicted_yield_unit (string), confidence_percentage (0-100), key_factors (array of strings), risk_factors (array of strings), revenue_estimate_low (number), revenue_estimate_high (number), harvest_date_estimate (string), recommendations (array of strings).`;

      const userPrompt = `Field: ${fieldText}\nCrop Type: ${crop_type}\nSeason: ${season}\n\nHistorical Yield Data:\n${historyText}\n\nPredict the yield for ${crop_type} in the ${season} season.`;

      const aiResponse = await openRouterService.makeRequest(userPrompt, systemPrompt);
      const content = aiResponse.choices?.[0]?.message?.content || '';

      const parsedResult = parseAIJson(content) || { harvest_date_estimate: content };

      // Save to harvest_predictions with all structured fields
      const saveResult = await pool.query(
        `INSERT INTO harvest_predictions
         (user_id, field_name, crop_type, ai_prediction, confidence_level,
          predicted_yield, yield_unit, revenue_estimate, expected_harvest_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          req.user.id,
          fieldInfo?.name || `Field ${field_id}`,
          crop_type,
          content,
          parsedResult.confidence_percentage || 75,
          parsedResult.predicted_yield_high || null,
          parsedResult.predicted_yield_unit || null,
          parsedResult.revenue_estimate_high || null,
          parsedResult.harvest_date_estimate || null
        ]
      );

      const aiResultForLog = {
        model: openRouterService.model,
        raw_json: parsedResult,
        usage: aiResponse.usage,
        success: true,
        confidence_score: parsedResult.confidence_percentage
      };
      await logAIResult(req.user.id, 'yield_prediction', aiResultForLog, 'harvest_predictions', saveResult.rows[0].id);

      res.json({
        prediction: saveResult.rows[0],
        analysis: parsedResult,
        field_id,
        crop_type,
        season
      });
    } catch (error) {
      console.error('Yield prediction error:', error);
      res.status(500).json({ error: 'Failed to generate yield prediction', details: error.message });
    }
  }
);

// POST /api/ai/pest-forecast
// Takes { field_id, pest_type, current_severity }, forecasts outbreak probability
router.post('/pest-forecast',
  authMiddleware,
  [
    body('field_id').notEmpty().withMessage('field_id is required'),
    body('pest_type').notEmpty().withMessage('pest_type is required').isLength({ max: 100 }),
    body('current_severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('current_severity must be low, medium, high, or critical')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { field_id, pest_type, current_severity = 'medium' } = req.body;

      // Fetch field info
      let fieldInfo = null;
      try {
        const fieldResult = await pool.query(
          'SELECT * FROM field_locations WHERE id = $1 AND user_id = $2',
          [field_id, req.user.id]
        );
        if (fieldResult.rows.length > 0) fieldInfo = fieldResult.rows[0];
      } catch (e) { /* ignore */ }

      // Fetch past pest history
      let pastPests = [];
      try {
        const pestResult = await pool.query(
          `SELECT pest_name, pest_type, affected_crop, severity, infestation_level, detected_date, treatment_options
           FROM pest_identifications
           WHERE user_id = $1 AND status != 'deleted'
           ORDER BY created_at DESC
           LIMIT 10`,
          [req.user.id]
        );
        pastPests = pestResult.rows;
      } catch (e) { /* ignore */ }

      const fieldText = fieldInfo
        ? `Field: ${fieldInfo.name}, Crop: ${fieldInfo.crop_type || 'Unknown'}, Size: ${fieldInfo.area_size || 'N/A'} ${fieldInfo.area_unit || ''}`
        : `Field ID: ${field_id}`;

      const pastPestText = pastPests.length > 0
        ? pastPests.map(p => `- Pest: ${p.pest_name || p.pest_type || 'Unknown'}, Crop: ${p.affected_crop}, Severity: ${p.severity}, Level: ${p.infestation_level || 'N/A'}, Date: ${p.detected_date || 'N/A'}`).join('\n')
        : 'No past pest history.';

      const systemPrompt = `You are an agricultural pest lifecycle expert specializing in population dynamics and outbreak forecasting. Analyze current pest severity and historical data to forecast outbreak probability in the next 2-3 weeks. Respond ONLY in JSON with fields: outbreak_probability_2_weeks (0-100), outbreak_probability_3_weeks (0-100), forecast_severity (low|medium|high|critical), lifecycle_stage (string), environmental_risk_factors (array of strings), recommended_interventions (array of {action, timing, effectiveness_rating}), monitoring_schedule (string), economic_threshold_risk (string).`;

      const userPrompt = `Field: ${fieldText}\nPest Type: ${pest_type}\nCurrent Severity: ${current_severity}\n\nPast Pest History:\n${pastPestText}\n\nForecast the outbreak probability for ${pest_type} over the next 2-3 weeks.`;

      const aiResponse = await openRouterService.makeRequest(userPrompt, systemPrompt);
      const content = aiResponse.choices?.[0]?.message?.content || '';

      const parsedResult = parseAIJson(content) || { forecast_severity: content };

      // Save forecast as a pest identification record (forecast context)
      const saveResult = await pool.query(
        `INSERT INTO pest_identifications
         (user_id, affected_crop, symptoms, location, severity, ai_identification, confidence_score, pest_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          req.user.id,
          fieldInfo?.crop_type || 'Unknown',
          `AI pest forecast for ${pest_type}. 2-week outbreak probability: ${parsedResult.outbreak_probability_2_weeks || '?'}%`,
          fieldInfo?.name || `Field ${field_id}`,
          parsedResult.forecast_severity || current_severity,
          content,
          parsedResult.outbreak_probability_2_weeks || 50,
          pest_type
        ]
      );

      const aiResultForLog = {
        model: openRouterService.model,
        raw_json: parsedResult,
        usage: aiResponse.usage,
        success: true,
        confidence_score: parsedResult.outbreak_probability_2_weeks
      };
      await logAIResult(req.user.id, 'pest_forecast', aiResultForLog, 'pest_identifications', saveResult.rows[0].id);

      res.json({
        forecast: saveResult.rows[0],
        analysis: parsedResult,
        field_id,
        pest_type,
        current_severity
      });
    } catch (error) {
      console.error('Pest forecast error:', error);
      res.status(500).json({ error: 'Failed to generate pest forecast', details: error.message });
    }
  }
);

// POST /api/ai/find-subsidies
// Takes { location, farm_type, crops }, identifies relevant USDA programs and grants
router.post('/find-subsidies',
  authMiddleware,
  [
    body('location').notEmpty().withMessage('location is required').isLength({ max: 200 }).trim(),
    body('farm_type').notEmpty().withMessage('farm_type is required').isLength({ max: 100 }).trim(),
    body('crops').notEmpty().withMessage('crops is required')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { location, farm_type, crops } = req.body;
      const cropsText = Array.isArray(crops) ? crops.join(', ') : String(crops);

      const systemPrompt = `You are a USDA agricultural subsidy and grant expert with up-to-date knowledge of federal, state, and local programs available to farmers. Identify all relevant programs for the farmer's profile. Respond ONLY in JSON with field: programs (array of objects with fields: program_name, agency, description, max_amount, eligibility_requirements, application_url, deadline, category (conservation|crop_insurance|price_support|organic|beginning_farmer|other)).`;

      const userPrompt = `Farmer Profile:\nLocation: ${location}\nFarm Type: ${farm_type}\nCrops Grown: ${cropsText}\n\nIdentify all relevant USDA programs, organic farming subsidies, conservation grants, crop insurance options, and other government assistance programs.`;

      const aiResponse = await openRouterService.makeRequest(userPrompt, systemPrompt);
      const content = aiResponse.choices?.[0]?.message?.content || '';

      const parsedResult = parseAIJson(content) || { programs: [], raw_response: content };

      // Persist search results to subsidy_searches table
      const saveResult = await pool.query(
        `INSERT INTO subsidy_searches (user_id, location, farm_type, crops, programs_found, programs_data, ai_response)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          req.user.id,
          location,
          farm_type,
          cropsText,
          (parsedResult.programs || []).length,
          JSON.stringify(parsedResult.programs || []),
          content
        ]
      );

      const aiResultForLog = {
        model: openRouterService.model,
        raw_json: parsedResult,
        usage: aiResponse.usage,
        success: true
      };
      await logAIResult(req.user.id, 'find_subsidies', aiResultForLog, 'subsidy_searches', saveResult.rows[0].id);

      res.json({
        search_id: saveResult.rows[0].id,
        location,
        farm_type,
        crops: cropsText,
        subsidies: parsedResult.programs || [],
        total_programs_found: (parsedResult.programs || []).length,
        generated_at: new Date().toISOString(),
        disclaimer: 'Program details are AI-generated. Verify all information directly with USDA or state agencies before applying.'
      });
    } catch (error) {
      console.error('Find subsidies error:', error);
      res.status(500).json({ error: 'Failed to find subsidies', details: error.message });
    }
  }
);

// POST /api/ai/farm-chat
// Conversational AI chat with farm context
router.post('/farm-chat',
  authMiddleware,
  [
    body('message').notEmpty().withMessage('message is required').isLength({ max: 2000 }).trim(),
    body('farm_context').optional().isObject()
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { message, farm_context = {} } = req.body;

      // Auto-build farm context from user's data if not provided
      let enrichedContext = { ...farm_context };
      if (Object.keys(farm_context).length === 0) {
        try {
          const [fieldsRes, diseasesRes, pestsRes] = await Promise.all([
            pool.query(`SELECT name, crop_type, area_size FROM field_locations WHERE user_id = $1 AND status = 'active' LIMIT 5`, [req.user.id]),
            pool.query(`SELECT crop_name, disease_name, severity FROM crop_diseases WHERE user_id = $1 AND status = 'active' LIMIT 5`, [req.user.id]),
            pool.query(`SELECT pest_name, affected_crop, infestation_level FROM pest_identifications WHERE user_id = $1 AND status = 'active' LIMIT 5`, [req.user.id])
          ]);
          enrichedContext = {
            fields: fieldsRes.rows,
            active_diseases: diseasesRes.rows,
            active_pests: pestsRes.rows
          };
        } catch (e) { /* ignore */ }
      }

      const aiResult = await openRouterService.farmChat(message, enrichedContext);

      // Save to farm_chat_history
      const saveResult = await pool.query(
        `INSERT INTO farm_chat_history (user_id, message, response, key_points, confidence, model)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          req.user.id,
          message,
          aiResult.answer || '',
          JSON.stringify(aiResult.key_points || []),
          aiResult.confidence || null,
          aiResult.model || openRouterService.model
        ]
      );

      await logAIResult(req.user.id, 'farm_chat', { ...aiResult, raw_json: { answer: aiResult.answer, key_points: aiResult.key_points } }, 'farm_chat_history', saveResult.rows[0].id);

      res.json({
        chat_id: saveResult.rows[0].id,
        message,
        answer: aiResult.answer,
        key_points: aiResult.key_points || [],
        follow_up_questions: aiResult.follow_up_questions || [],
        confidence: aiResult.confidence,
        sources_to_verify: aiResult.sources_to_verify || [],
        model: aiResult.model,
        timestamp: aiResult.timestamp
      });
    } catch (error) {
      console.error('Farm chat error:', error);
      res.status(500).json({ error: 'Failed to process farm chat message', details: error.message });
    }
  }
);

// GET /api/ai/farm-chat/history — chat history
router.get('/farm-chat/history',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      const countResult = await pool.query(
        'SELECT COUNT(*)::int AS total FROM farm_chat_history WHERE user_id = $1',
        [req.user.id]
      );
      const total = countResult.rows[0].total;

      const result = await pool.query(
        `SELECT id, message, response, key_points, confidence, model, created_at
         FROM farm_chat_history WHERE user_id = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset]
      );

      res.json({
        records: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (error) {
      console.error('Farm chat history error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /api/ai/carbon-footprint
router.post('/carbon-footprint',
  authMiddleware,
  [
    body('farm_size').optional().isFloat({ min: 0, max: 999999 }).withMessage('farm_size must be a positive number'),
    body('crops').optional().isString().isLength({ max: 500 }).trim(),
    body('irrigation_type').optional().isLength({ max: 100 }).trim(),
    body('water_usage').optional().isFloat({ min: 0 }).withMessage('water_usage must be positive'),
    body('fertilizer_usage').optional().isFloat({ min: 0 }).withMessage('fertilizer_usage must be positive'),
    body('machinery').optional().isLength({ max: 500 }).trim(),
    body('livestock').optional().isLength({ max: 500 }).trim(),
    body('location').optional().isLength({ max: 200 }).trim()
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const farmData = req.body;

      // Auto-fill from user profile if not provided
      if (!farmData.farm_size || !farmData.crops) {
        try {
          const userRes = await pool.query('SELECT farm_size, location FROM users WHERE id = $1', [req.user.id]);
          const fieldsRes = await pool.query(
            `SELECT crop_type, area_size FROM field_locations WHERE user_id = $1 AND status = 'active' LIMIT 10`,
            [req.user.id]
          );
          if (userRes.rows[0] && !farmData.farm_size) farmData.farm_size = userRes.rows[0].farm_size;
          if (userRes.rows[0] && !farmData.location) farmData.location = userRes.rows[0].location;
          if (fieldsRes.rows.length > 0 && !farmData.crops) {
            farmData.crops = fieldsRes.rows.map(f => f.crop_type).filter(Boolean).join(', ');
          }
        } catch (e) { /* ignore */ }
      }

      const aiResult = await openRouterService.calculateCarbonFootprint(farmData);

      // Save to carbon_footprint_records
      const saveResult = await pool.query(
        `INSERT INTO carbon_footprint_records
         (user_id, farm_size, crops, total_co2_tons_per_year, sustainability_score, carbon_credits_estimate_usd, breakdown, reduction_recommendations, ai_analysis)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          req.user.id,
          farmData.farm_size || null,
          farmData.crops || null,
          aiResult.total_co2_tons_per_year || null,
          aiResult.sustainability_score || null,
          aiResult.carbon_credits_estimate_usd || null,
          JSON.stringify(aiResult.breakdown || {}),
          JSON.stringify(aiResult.reduction_recommendations || []),
          JSON.stringify(aiResult)
        ]
      );

      await logAIResult(req.user.id, 'carbon_footprint', { ...aiResult, raw_json: aiResult, model: aiResult.model || openRouterService.model }, 'carbon_footprint_records', saveResult.rows[0].id);

      res.json({
        record_id: saveResult.rows[0].id,
        ...aiResult
      });
    } catch (error) {
      console.error('Carbon footprint error:', error);
      res.status(500).json({ error: 'Failed to calculate carbon footprint', details: error.message });
    }
  }
);

// POST /api/ai/weekly-report
router.post('/weekly-report',
  authMiddleware,
  [
    body('week').optional().isISO8601().withMessage('week must be a valid date (YYYY-MM-DD)')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const week = req.body.week || new Date().toISOString().split('T')[0];

      // Gather all farm data for the report
      const [
        userRes, diseasesRes, irrigationRes,
        harvestRes, pestsRes, soilRes
      ] = await Promise.all([
        pool.query('SELECT name, farm_name, farm_size, location FROM users WHERE id = $1', [req.user.id]),
        pool.query(`SELECT crop_name, disease_name, severity, ai_diagnosis FROM crop_diseases WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 5`, [req.user.id]),
        pool.query(`SELECT field_name, crop_type, efficiency_score, next_irrigation FROM irrigation_records WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 5`, [req.user.id]),
        pool.query(`SELECT field_name, crop_type, expected_harvest_date, predicted_yield, yield_unit FROM harvest_predictions WHERE user_id = $1 AND status = 'active' ORDER BY expected_harvest_date ASC LIMIT 5`, [req.user.id]),
        pool.query(`SELECT pest_name, affected_crop, infestation_level FROM pest_identifications WHERE user_id = $1 AND status = 'active' LIMIT 5`, [req.user.id]),
        pool.query(`SELECT field_name, health_score, ph_level FROM soil_analyses WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 5`, [req.user.id])
      ]);

      const reportData = {
        week,
        farm: userRes.rows[0] || {},
        diseases: diseasesRes.rows,
        irrigation: irrigationRes.rows,
        harvest: harvestRes.rows,
        pests: pestsRes.rows,
        soil: soilRes.rows
      };

      const aiResult = await openRouterService.generateWeeklyReport(reportData);

      res.json({
        week,
        summary: aiResult.summary,
        highlights: aiResult.highlights || [],
        alerts: aiResult.alerts || [],
        recommendations_this_week: aiResult.recommendations_this_week || [],
        upcoming_tasks: aiResult.upcoming_tasks || [],
        performance_summary: aiResult.performance_summary || {},
        report_markdown: aiResult.report_markdown || '',
        model: aiResult.model,
        timestamp: aiResult.timestamp
      });
    } catch (error) {
      console.error('Weekly report error:', error);
      res.status(500).json({ error: 'Failed to generate weekly report', details: error.message });
    }
  }
);

// POST /api/ai/weather-risk-alert
// Audit-recommended: AI weather-based risk alerts (hail, frost, drought)
router.post('/weather-risk-alert',
  authMiddleware,
  [
    body('field_id').optional().notEmpty(),
    body('crop_type').optional().isString().isLength({ max: 200 }),
    body('forecast').notEmpty().withMessage('forecast (text or object) is required'),
    body('growth_stage').optional().isString().isLength({ max: 200 })
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { field_id, crop_type, forecast, growth_stage } = req.body;

      const forecastText = typeof forecast === 'string' ? forecast : JSON.stringify(forecast);

      const systemPrompt = `You are an expert agricultural meteorologist. Given a multi-day weather forecast and crop information, identify high-risk weather events (hail, frost, drought, heat-stress, flooding, high-wind, severe-storm) for the upcoming period and recommend protective actions. Respond ONLY in JSON:
{
  "overall_risk_level": "Low|Medium|High|Severe",
  "alerts": [
    {
      "event_type": "hail|frost|drought|heat_stress|flood|high_wind|severe_storm|other",
      "severity": "Low|Medium|High|Severe",
      "expected_window": "string",
      "expected_impact": "string",
      "affected_growth_stages": ["string"],
      "recommended_actions": ["string", "string"],
      "urgency": "Immediate|24h|48h|This_week"
    }
  ],
  "next_72h_summary": "string",
  "next_7d_summary": "string",
  "irrigation_adjustment": "string",
  "harvest_timing_advice": "string",
  "confidence_score": number
}`;

      const userPrompt = `Field/Crop:
- field_id: ${field_id || 'N/A'}
- crop: ${crop_type || 'unspecified'}
- growth_stage: ${growth_stage || 'unspecified'}

Weather forecast:
${forecastText}

Identify risks and recommend actions.`;

      const aiResponse = await openRouterService.makeRequest(userPrompt, systemPrompt);
      const content = aiResponse.choices?.[0]?.message?.content || '';
      const parsedResult = parseAIJson(content) || { next_72h_summary: content };

      const aiResultForLog = {
        model: openRouterService.model,
        raw_json: parsedResult,
        usage: aiResponse.usage,
        success: true
      };
      await logAIResult(req.user.id, 'weather_risk_alert', aiResultForLog, 'field_locations', field_id || null);

      res.json({
        analysis: parsedResult,
        field_id: field_id || null,
        crop_type: crop_type || null
      });
    } catch (error) {
      console.error('Weather risk alert error:', error);
      res.status(500).json({ error: 'Failed to generate weather risk alert', details: error.message });
    }
  }
);

// POST /api/ai/soil-amendment
// Audit-recommended: AI soil amendment recommendation
router.post('/soil-amendment',
  authMiddleware,
  [
    body('field_id').optional().notEmpty(),
    body('soil_data').notEmpty().withMessage('soil_data (text or object) is required'),
    body('crop_type').optional().isString().isLength({ max: 200 }),
    body('target_yield').optional().isString().isLength({ max: 200 })
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { field_id, soil_data, crop_type, target_yield } = req.body;

      const soilText = typeof soil_data === 'string' ? soil_data : JSON.stringify(soil_data);

      const systemPrompt = `You are a soil science expert. Given soil test results and crop information, recommend specific soil amendments (lime, gypsum, NPK fertilizers, organic matter, micronutrients) with rates and timing. Respond ONLY in JSON:
{
  "soil_health_score": number,
  "primary_deficiencies": ["string"],
  "primary_excesses": ["string"],
  "amendments": [
    {
      "amendment": "string",
      "purpose": "string",
      "rate": "string",
      "application_timing": "string",
      "estimated_cost_per_acre_usd": number,
      "expected_outcome": "string"
    }
  ],
  "ph_adjustment": {
    "current": number,
    "target": number,
    "method": "string",
    "rate": "string"
  },
  "organic_matter_recommendation": "string",
  "cover_crop_suggestions": ["string"],
  "monitoring_plan": ["string"],
  "confidence_score": number
}`;

      const userPrompt = `Soil data:
${soilText}

Crop: ${crop_type || 'unspecified'}
Target yield: ${target_yield || 'unspecified'}

Recommend soil amendments.`;

      const aiResponse = await openRouterService.makeRequest(userPrompt, systemPrompt);
      const content = aiResponse.choices?.[0]?.message?.content || '';
      const parsedResult = parseAIJson(content) || { summary: content };

      const aiResultForLog = {
        model: openRouterService.model,
        raw_json: parsedResult,
        usage: aiResponse.usage,
        success: true
      };
      await logAIResult(req.user.id, 'soil_amendment', aiResultForLog, 'field_locations', field_id || null);

      res.json({
        analysis: parsedResult,
        field_id: field_id || null,
        crop_type: crop_type || null
      });
    } catch (error) {
      console.error('Soil amendment error:', error);
      res.status(500).json({ error: 'Failed to generate soil amendment recommendation', details: error.message });
    }
  }
);

// ----------------------------------------------------------------------
// Apply pass 5 (backlog) — additive AI endpoints.
// Required env vars: OPENROUTER_API_KEY (returns 503 + missing if absent).
// All endpoints reuse openRouterService.makeRequest + parseAIJson + logAIResult.
// ----------------------------------------------------------------------

// Helper: 503 if no OpenRouter key configured.
function requireOpenRouterKey(res) {
  if (!process.env.OPENROUTER_API_KEY) {
    res.status(503).json({ error: 'AI service unavailable', missing: 'OPENROUTER_API_KEY' });
    return true;
  }
  return false;
}

// POST /api/ai/disease-id-text
// PRODUCT-DECISION: image-based disease ID is TOO-RISKY (vision pipeline);
// this text-based variant accepts a textual description of leaf/plant
// symptoms instead, which works without a vision model.
router.post('/disease-id-text',
  authMiddleware,
  [
    body('crop_type').notEmpty().isString().isLength({ max: 200 }),
    body('symptoms_description').notEmpty().isString().isLength({ max: 4000 }),
    body('field_id').optional().notEmpty()
  ],
  async (req, res) => {
    if (requireOpenRouterKey(res)) return;
    const validationError = handleValidation(req, res);
    if (validationError) return;
    try {
      const { crop_type, symptoms_description, field_id } = req.body;
      const systemPrompt = `You are a plant pathologist. Given a textual symptom description, suggest likely diseases / pests / nutrient disorders for the crop. Respond ONLY in JSON:
{
  "candidates": [{ "name": "string", "likelihood": "Low|Medium|High", "evidence": "string", "confirmatory_tests": ["string"], "recommended_actions": ["string"] }],
  "differential_summary": "string",
  "urgency": "Routine|Soon|Immediate",
  "confidence_score": number
}`;
      const userPrompt = `Crop: ${crop_type}\nField: ${field_id || 'N/A'}\nSymptom description:\n${symptoms_description}`;
      const aiResponse = await openRouterService.makeRequest(userPrompt, systemPrompt);
      const content = aiResponse.choices?.[0]?.message?.content || '';
      const parsedResult = parseAIJson(content) || { differential_summary: content };
      await logAIResult(req.user.id, 'disease_id_text', { model: openRouterService.model, raw_json: parsedResult, usage: aiResponse.usage, success: true }, 'field_locations', field_id || null);
      res.json({ analysis: parsedResult, crop_type, field_id: field_id || null });
    } catch (error) {
      console.error('disease-id-text error:', error);
      if (/api[_ ]?key|401/i.test(error.message || '')) {
        return res.status(503).json({ error: 'AI service unavailable', missing: 'OPENROUTER_API_KEY' });
      }
      res.status(500).json({ error: 'Failed to identify disease', details: error.message });
    }
  }
);

// POST /api/ai/market-price-prediction
// NEEDS-CREDS: a real implementation would call commodity-market data feeds
// (USDA, CME, etc.). PRODUCT-DECISION: in lieu of a paid feed, accept a
// caller-supplied `recent_prices` time series and let the model project
// short-term direction. Document this in the response shape.
router.post('/market-price-prediction',
  authMiddleware,
  [
    body('commodity').notEmpty().isString().isLength({ max: 200 }),
    body('region').optional().isString().isLength({ max: 200 }),
    body('recent_prices').optional(),
    body('horizon_days').optional().isInt({ min: 1, max: 180 })
  ],
  async (req, res) => {
    if (requireOpenRouterKey(res)) return;
    const validationError = handleValidation(req, res);
    if (validationError) return;
    try {
      const { commodity, region, recent_prices, horizon_days } = req.body;
      const horizon = horizon_days || 30;
      const series = recent_prices ? (typeof recent_prices === 'string' ? recent_prices : JSON.stringify(recent_prices)) : '(none provided — model should reason from general knowledge)';
      const systemPrompt = `You are an agricultural commodities analyst. Project short-term price direction and recommend timing. Respond ONLY in JSON:
{
  "commodity": "string",
  "horizon_days": number,
  "direction": "Up|Down|Sideways",
  "expected_change_pct": number,
  "confidence": "Low|Medium|High",
  "key_drivers": ["string"],
  "sell_window_recommendation": "string",
  "hedging_suggestions": ["string"],
  "data_quality_note": "string"
}`;
      const userPrompt = `Commodity: ${commodity}\nRegion: ${region || 'global'}\nHorizon (days): ${horizon}\nRecent prices: ${series}`;
      const aiResponse = await openRouterService.makeRequest(userPrompt, systemPrompt);
      const content = aiResponse.choices?.[0]?.message?.content || '';
      const parsedResult = parseAIJson(content) || { summary: content };
      await logAIResult(req.user.id, 'market_price_prediction', { model: openRouterService.model, raw_json: parsedResult, usage: aiResponse.usage, success: true }, 'commodity', commodity);
      res.json({ analysis: parsedResult, commodity, horizon_days: horizon });
    } catch (error) {
      console.error('market-price-prediction error:', error);
      if (/api[_ ]?key|401/i.test(error.message || '')) {
        return res.status(503).json({ error: 'AI service unavailable', missing: 'OPENROUTER_API_KEY' });
      }
      res.status(500).json({ error: 'Failed to predict market price', details: error.message });
    }
  }
);

// POST /api/ai/sustainability-score
// PRODUCT-DECISION: there is no industry-standard farm sustainability
// framework wired into this app. We let the model produce a 0-100
// composite score across soil, water, biodiversity, GHG, and inputs,
// labelling each contributing axis transparently so a future
// rubric (e.g., COMET-Farm, FAO SAFA) can be substituted later.
router.post('/sustainability-score',
  authMiddleware,
  [
    body('farm_summary').notEmpty(),
    body('field_id').optional().notEmpty()
  ],
  async (req, res) => {
    if (requireOpenRouterKey(res)) return;
    const validationError = handleValidation(req, res);
    if (validationError) return;
    try {
      const { farm_summary, field_id } = req.body;
      const summaryText = typeof farm_summary === 'string' ? farm_summary : JSON.stringify(farm_summary);
      const systemPrompt = `You are an agronomist scoring a farm's sustainability. Respond ONLY in JSON:
{
  "overall_score_0_100": number,
  "axes": {
    "soil_health": { "score": number, "notes": "string" },
    "water_use": { "score": number, "notes": "string" },
    "biodiversity": { "score": number, "notes": "string" },
    "ghg_emissions": { "score": number, "notes": "string" },
    "input_efficiency": { "score": number, "notes": "string" }
  },
  "highest_impact_improvements": ["string"],
  "framework_caveat": "string",
  "confidence_score": number
}`;
      const userPrompt = `Farm summary:\n${summaryText}`;
      const aiResponse = await openRouterService.makeRequest(userPrompt, systemPrompt);
      const content = aiResponse.choices?.[0]?.message?.content || '';
      const parsedResult = parseAIJson(content) || { summary: content };
      await logAIResult(req.user.id, 'sustainability_score', { model: openRouterService.model, raw_json: parsedResult, usage: aiResponse.usage, success: true }, 'field_locations', field_id || null);
      res.json({ analysis: parsedResult, field_id: field_id || null });
    } catch (error) {
      console.error('sustainability-score error:', error);
      if (/api[_ ]?key|401/i.test(error.message || '')) {
        return res.status(503).json({ error: 'AI service unavailable', missing: 'OPENROUTER_API_KEY' });
      }
      res.status(500).json({ error: 'Failed to score sustainability', details: error.message });
    }
  }
);

// POST /api/ai/irrigation-optimize-text
// PRODUCT-DECISION: real-time IoT-stream-driven irrigation is TOO-RISKY
// (sensor pipeline). This text variant accepts a textual snapshot of
// soil-moisture / weather / crop stage and returns a near-term
// irrigation schedule.
router.post('/irrigation-optimize-text',
  authMiddleware,
  [
    body('field_id').optional().notEmpty(),
    body('crop_type').optional().isString().isLength({ max: 200 }),
    body('snapshot').notEmpty()
  ],
  async (req, res) => {
    if (requireOpenRouterKey(res)) return;
    const validationError = handleValidation(req, res);
    if (validationError) return;
    try {
      const { field_id, crop_type, snapshot } = req.body;
      const snapshotText = typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);
      const systemPrompt = `You are an irrigation engineer. Given a snapshot of soil moisture, weather, and crop stage, propose a 7-day irrigation schedule. Respond ONLY in JSON:
{
  "schedule": [{ "day_offset": number, "action": "irrigate|skip|reduce", "duration_minutes": number, "amount_mm": number, "reason": "string" }],
  "total_mm_next_7d": number,
  "stress_risks": ["string"],
  "monitoring_advice": ["string"],
  "confidence_score": number
}`;
      const userPrompt = `Field: ${field_id || 'N/A'}\nCrop: ${crop_type || 'unspecified'}\nSnapshot:\n${snapshotText}`;
      const aiResponse = await openRouterService.makeRequest(userPrompt, systemPrompt);
      const content = aiResponse.choices?.[0]?.message?.content || '';
      const parsedResult = parseAIJson(content) || { summary: content };
      await logAIResult(req.user.id, 'irrigation_optimize_text', { model: openRouterService.model, raw_json: parsedResult, usage: aiResponse.usage, success: true }, 'field_locations', field_id || null);
      res.json({ analysis: parsedResult, field_id: field_id || null });
    } catch (error) {
      console.error('irrigation-optimize-text error:', error);
      if (/api[_ ]?key|401/i.test(error.message || '')) {
        return res.status(503).json({ error: 'AI service unavailable', missing: 'OPENROUTER_API_KEY' });
      }
      res.status(500).json({ error: 'Failed to optimize irrigation', details: error.message });
    }
  }
);

// POST /api/ai/iot-sensor-summary
// NEEDS-CREDS: real IoT integrations (Phytos / Indigo / John Deere) require
// vendor credentials. PRODUCT-DECISION: accept caller-uploaded sensor
// readings as text/JSON and let the model summarize anomalies and trends.
router.post('/iot-sensor-summary',
  authMiddleware,
  [
    body('readings').notEmpty(),
    body('field_id').optional().notEmpty()
  ],
  async (req, res) => {
    if (requireOpenRouterKey(res)) return;
    const validationError = handleValidation(req, res);
    if (validationError) return;
    try {
      const { readings, field_id } = req.body;
      const readingsText = typeof readings === 'string' ? readings : JSON.stringify(readings);
      const systemPrompt = `You are an agronomy data analyst. Summarize IoT/sensor readings, surface anomalies, and recommend actions. Respond ONLY in JSON:
{
  "summary": "string",
  "trends": [{ "metric": "string", "direction": "rising|falling|stable", "note": "string" }],
  "anomalies": [{ "metric": "string", "value": "string", "severity": "Low|Medium|High", "note": "string" }],
  "recommended_actions": ["string"],
  "confidence_score": number
}`;
      const userPrompt = `Field: ${field_id || 'N/A'}\nReadings:\n${readingsText.slice(0, 6000)}`;
      const aiResponse = await openRouterService.makeRequest(userPrompt, systemPrompt);
      const content = aiResponse.choices?.[0]?.message?.content || '';
      const parsedResult = parseAIJson(content) || { summary: content };
      await logAIResult(req.user.id, 'iot_sensor_summary', { model: openRouterService.model, raw_json: parsedResult, usage: aiResponse.usage, success: true }, 'field_locations', field_id || null);
      res.json({ analysis: parsedResult, field_id: field_id || null });
    } catch (error) {
      console.error('iot-sensor-summary error:', error);
      if (/api[_ ]?key|401/i.test(error.message || '')) {
        return res.status(503).json({ error: 'AI service unavailable', missing: 'OPENROUTER_API_KEY' });
      }
      res.status(500).json({ error: 'Failed to summarize sensor data', details: error.message });
    }
  }
);

module.exports = router;
