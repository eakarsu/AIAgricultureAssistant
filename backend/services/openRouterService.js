const https = require('https');
require('dotenv').config();

// Shared JSON parser utility - tries multiple strategies to extract JSON from AI text
function parseAIJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (e) {}
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch (e) {}
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) { try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {} }
  return null;
}

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    // Upgrade to claude-3-5-sonnet for better analysis quality
    this.model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
    this.baseUrl = 'openrouter.ai';
  }

  // Primary method: uses fetch with 30-second timeout (Node.js 18+)
  async makeRequestFetch(prompt, systemPrompt = '') {
    const body = JSON.stringify({
      model: this.model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: 10000,
      temperature: 0.3
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
          'X-Title': 'AI Agriculture Assistant'
        },
        body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const parsed = await response.json();
      if (parsed.error) {
        throw new Error(parsed.error.message || 'OpenRouter API error');
      }
      return parsed;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out after 45 seconds');
      }
      throw err;
    }
  }

  // Fallback method: uses https.request (original implementation)
  async makeRequestHttps(prompt, systemPrompt = '') {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: this.model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: 10000,
        temperature: 0.3
      });

      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
          'X-Title': 'AI Agriculture Assistant'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (parsed.error) {
              reject(new Error(parsed.error.message || 'OpenRouter API error'));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error('Failed to parse API response'));
          }
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      req.write(data);
      req.end();
    });
  }

  // Main makeRequest: tries fetch first, falls back to https.request
  async makeRequest(prompt, systemPrompt = '') {
    try {
      return await this.makeRequestFetch(prompt, systemPrompt);
    } catch (fetchErr) {
      console.warn('fetch-based OpenRouter request failed, falling back to https.request:', fetchErr.message);
      return await this.makeRequestHttps(prompt, systemPrompt);
    }
  }

  // Crop Disease Detection - returns structured JSON
  async analyzeCropDisease(cropData) {
    const systemPrompt = `You are an expert agricultural AI assistant specializing in crop disease detection and treatment. You MUST respond with ONLY a valid JSON object — no markdown, no explanation text outside the JSON. The JSON must have exactly these fields:
{
  "diagnosis": "string - the likely disease name(s)",
  "severity": "mild|moderate|severe",
  "confidence_score": 0-100,
  "treatment_recommendations": "string - specific treatments and products",
  "prevention_measures": "string - how to prevent future occurrences",
  "immediate_actions": "string - what the farmer should do right now",
  "analysis": "string - full detailed analysis",
  "estimated_crop_loss_percent": 0-100,
  "organic_alternatives": "string - organic treatment options"
}`;

    const prompt = `Analyze the following crop for potential diseases:

Crop: ${cropData.crop_name}
Symptoms: ${cropData.symptoms}
Location: ${cropData.location || 'Not specified'}
${cropData.additional_info ? `Additional Information: ${cropData.additional_info}` : ''}

Respond with ONLY a JSON object.`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const content = response.choices?.[0]?.message?.content || '';

      const aiResult = parseAIJson(content) || {};

      return {
        success: true,
        analysis: aiResult.analysis || content,
        confidence_score: aiResult.confidence_score || 85,
        diagnosis: aiResult.diagnosis || null,
        severity: aiResult.severity || null,
        treatment_recommendations: aiResult.treatment_recommendations || null,
        prevention_measures: aiResult.prevention_measures || null,
        immediate_actions: aiResult.immediate_actions || null,
        estimated_crop_loss_percent: aiResult.estimated_crop_loss_percent || null,
        organic_alternatives: aiResult.organic_alternatives || null,
        raw_json: aiResult,
        model: this.model,
        usage: response.usage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        analysis: 'AI analysis temporarily unavailable. Please try again later.',
        confidence_score: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Irrigation Optimization - returns structured JSON
  async optimizeIrrigation(irrigationData) {
    const systemPrompt = `You are an expert agricultural AI assistant specializing in irrigation management and water optimization. You MUST respond with ONLY a valid JSON object — no markdown, no explanation text outside the JSON. The JSON must have exactly these fields:
{
  "water_needed_gallons": number,
  "irrigation_schedule": "string - when and how often",
  "efficiency_score": 0-100,
  "optimization_tips": ["array of tip strings"],
  "weather_considerations": "string",
  "estimated_cost_savings_percent": number,
  "next_irrigation_date": "YYYY-MM-DD or description",
  "frequency_days": number,
  "analysis": "string - full detailed analysis",
  "water_stress_risk": "low|medium|high"
}`;

    const prompt = `Analyze the following field and provide irrigation recommendations:

Field Name: ${irrigationData.field_name}
Crop Type: ${irrigationData.crop_type || 'Unknown'}
Field Size: ${irrigationData.field_size || 'Unknown'} ${irrigationData.field_size_unit || 'acres'}
Soil Type: ${irrigationData.soil_type || 'Not specified'}
Current Soil Moisture: ${irrigationData.current_moisture || 'Not measured'}%
Target Moisture: ${irrigationData.target_moisture || 'Not specified'}%
Current Weather: ${irrigationData.weather_condition || 'Not specified'}
Temperature: ${irrigationData.temperature || 'Not specified'}°F
Humidity: ${irrigationData.humidity || 'Not specified'}%
Last Irrigation: ${irrigationData.last_irrigation || 'Not specified'}

Respond with ONLY a JSON object.`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const content = response.choices?.[0]?.message?.content || '';

      const aiResult = parseAIJson(content) || {};

      return {
        success: true,
        recommendation: aiResult.analysis || content,
        water_needed_gallons: aiResult.water_needed_gallons || null,
        irrigation_schedule: aiResult.irrigation_schedule || null,
        efficiency_score: aiResult.efficiency_score || null,
        optimization_tips: aiResult.optimization_tips || [],
        weather_considerations: aiResult.weather_considerations || null,
        estimated_cost_savings_percent: aiResult.estimated_cost_savings_percent || null,
        next_irrigation_date: aiResult.next_irrigation_date || null,
        frequency_days: aiResult.frequency_days || null,
        water_stress_risk: aiResult.water_stress_risk || null,
        raw_json: aiResult,
        model: this.model,
        usage: response.usage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        recommendation: 'AI recommendation temporarily unavailable. Please try again later.',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Harvest Prediction - returns structured JSON
  async predictHarvest(harvestData) {
    const systemPrompt = `You are an expert agricultural AI assistant specializing in yield prediction and harvest optimization. You MUST respond with ONLY a valid JSON object — no markdown, no explanation text outside the JSON. The JSON must have exactly these fields:
{
  "expected_harvest_date": "YYYY-MM-DD",
  "harvest_date_range_start": "YYYY-MM-DD",
  "harvest_date_range_end": "YYYY-MM-DD",
  "predicted_yield": number,
  "yield_unit": "string e.g. bushels/acre or tons",
  "confidence_level": 0-100,
  "quality_assessment": "string",
  "risk_factors": ["array of risk strings"],
  "market_timing_recommendation": "string",
  "revenue_estimate_low": number,
  "revenue_estimate_high": number,
  "analysis": "string - full detailed prediction narrative"
}`;

    const prompt = `Predict the harvest for the following crop:

Field Name: ${harvestData.field_name}
Crop Type: ${harvestData.crop_type}
Field Size: ${harvestData.field_size || 'Unknown'} ${harvestData.field_size_unit || 'acres'}
Planting Date: ${harvestData.planting_date || 'Not specified'}
Current Growth Stage: ${harvestData.current_growth_stage || 'Not specified'}
Health Status: ${harvestData.health_status || 'Not specified'}
Weather Outlook: ${harvestData.weather_outlook || 'Not specified'}

Respond with ONLY a JSON object.`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const content = response.choices?.[0]?.message?.content || '';

      const aiResult = parseAIJson(content) || {};

      return {
        success: true,
        prediction: aiResult.analysis || content,
        expected_harvest_date: aiResult.expected_harvest_date || null,
        harvest_date_range_start: aiResult.harvest_date_range_start || null,
        harvest_date_range_end: aiResult.harvest_date_range_end || null,
        predicted_yield: aiResult.predicted_yield || null,
        yield_unit: aiResult.yield_unit || null,
        confidence_level: aiResult.confidence_level || null,
        quality_assessment: aiResult.quality_assessment || null,
        risk_factors: aiResult.risk_factors || [],
        market_timing_recommendation: aiResult.market_timing_recommendation || null,
        revenue_estimate_low: aiResult.revenue_estimate_low || null,
        revenue_estimate_high: aiResult.revenue_estimate_high || null,
        raw_json: aiResult,
        model: this.model,
        usage: response.usage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        prediction: 'AI prediction temporarily unavailable. Please try again later.',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Pest Identification - returns structured JSON
  async identifyPest(pestData) {
    const systemPrompt = `You are an expert agricultural AI assistant specializing in pest identification and integrated pest management. You MUST respond with ONLY a valid JSON object — no markdown, no explanation text outside the JSON. The JSON must have exactly these fields:
{
  "pest_name": "string - most likely pest name",
  "pest_type": "string - insect|mite|rodent|fungus|nematode|other",
  "confidence_score": 0-100,
  "infestation_level": "low|medium|high|critical",
  "treatment_options": "string - both organic and chemical solutions",
  "organic_treatments": ["array of organic treatment strings"],
  "chemical_treatments": ["array of chemical treatment strings"],
  "prevention_measures": "string",
  "natural_predators": ["array of beneficial organisms"],
  "immediate_actions": "string - what to do right now",
  "economic_damage_threshold": "string",
  "analysis": "string - full detailed identification narrative"
}`;

    const prompt = `Identify and provide management recommendations for the following pest issue:

Affected Crop: ${pestData.affected_crop}
Symptoms/Signs: ${pestData.symptoms || 'Not specified'}
Location: ${pestData.location || 'Not specified'}
Severity: ${pestData.severity || 'Not assessed'}
${pestData.additional_info ? `Additional Information: ${pestData.additional_info}` : ''}

Respond with ONLY a JSON object.`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const content = response.choices?.[0]?.message?.content || '';

      const aiResult = parseAIJson(content) || {};

      return {
        success: true,
        identification: aiResult.analysis || content,
        pest_name: aiResult.pest_name || null,
        pest_type: aiResult.pest_type || null,
        confidence_score: aiResult.confidence_score || null,
        infestation_level: aiResult.infestation_level || null,
        treatment_options: aiResult.treatment_options || null,
        organic_treatments: aiResult.organic_treatments || [],
        chemical_treatments: aiResult.chemical_treatments || [],
        prevention_measures: aiResult.prevention_measures || null,
        natural_predators: aiResult.natural_predators || [],
        immediate_actions: aiResult.immediate_actions || null,
        economic_damage_threshold: aiResult.economic_damage_threshold || null,
        raw_json: aiResult,
        model: this.model,
        usage: response.usage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        identification: 'AI identification temporarily unavailable. Please try again later.',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Soil Analysis - returns structured JSON
  async analyzeSoil(soilData) {
    const systemPrompt = `You are an expert agricultural AI assistant specializing in soil science and fertility management. You MUST respond with ONLY a valid JSON object — no markdown, no explanation text outside the JSON. The JSON must have exactly these fields:
{
  "health_score": 0-100,
  "nutrient_status": {
    "nitrogen": "deficient|adequate|excessive",
    "phosphorus": "deficient|adequate|excessive",
    "potassium": "deficient|adequate|excessive"
  },
  "ph_assessment": "string - is pH optimal and what adjustments are needed",
  "suitable_crops": ["array of crop name strings"],
  "fertilizer_recommendations": "string - specific fertilizers and application rates",
  "soil_amendments": ["array of amendment strings"],
  "long_term_improvement_plan": "string",
  "potential_issues": ["array of issue strings"],
  "recommendations": "string - comprehensive improvement recommendations",
  "analysis": "string - full detailed soil health narrative"
}`;

    const prompt = `Analyze the following soil sample data:

Field Name: ${soilData.field_name}
Sample Location: ${soilData.sample_location || 'Not specified'}
pH Level: ${soilData.ph_level || 'Not measured'}
Nitrogen (N): ${soilData.nitrogen_level || 'Not measured'} ppm
Phosphorus (P): ${soilData.phosphorus_level || 'Not measured'} ppm
Potassium (K): ${soilData.potassium_level || 'Not measured'} ppm
Organic Matter: ${soilData.organic_matter || 'Not measured'}%
Soil Texture: ${soilData.soil_texture || 'Not specified'}
Moisture Content: ${soilData.moisture_content || 'Not measured'}%
Electrical Conductivity: ${soilData.electrical_conductivity || 'Not measured'} dS/m

Respond with ONLY a JSON object.`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const content = response.choices?.[0]?.message?.content || '';

      const aiResult = parseAIJson(content) || {};

      return {
        success: true,
        analysis: aiResult.analysis || content,
        health_score: aiResult.health_score || null,
        nutrient_status: aiResult.nutrient_status || null,
        ph_assessment: aiResult.ph_assessment || null,
        suitable_crops: aiResult.suitable_crops || [],
        fertilizer_recommendations: aiResult.fertilizer_recommendations || null,
        soil_amendments: aiResult.soil_amendments || [],
        long_term_improvement_plan: aiResult.long_term_improvement_plan || null,
        potential_issues: aiResult.potential_issues || [],
        recommendations: aiResult.recommendations || null,
        raw_json: aiResult,
        model: this.model,
        usage: response.usage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        analysis: 'AI analysis temporarily unavailable. Please try again later.',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Farm Chat Assistant - conversational AI with farm context
  async farmChat(message, farmContext = {}) {
    const systemPrompt = `You are an expert AI farm advisor. You have deep knowledge of agronomy, crop science, irrigation, soil health, pest management, and agricultural economics. Answer the farmer's question concisely and practically. Use their farm data context when available. Always provide actionable advice. Respond in JSON with fields: answer (string - your response), key_points (array of strings - bullet points), follow_up_questions (array of 2-3 strings the farmer might want to ask next), confidence (0-100), sources_to_verify (array of strings - recommend verification sources).`;

    const contextText = Object.keys(farmContext).length > 0
      ? `\n\nFarm Context:\n${JSON.stringify(farmContext, null, 2)}\n\n`
      : '';

    const prompt = `${contextText}Farmer's Question: ${message}`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const content = response.choices?.[0]?.message?.content || '';
      const aiResult = parseAIJson(content) || { answer: content, key_points: [], follow_up_questions: [], confidence: 80 };

      return {
        success: true,
        answer: aiResult.answer || content,
        key_points: aiResult.key_points || [],
        follow_up_questions: aiResult.follow_up_questions || [],
        confidence: aiResult.confidence || 80,
        sources_to_verify: aiResult.sources_to_verify || [],
        model: this.model,
        usage: response.usage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        answer: 'AI assistant temporarily unavailable. Please try again later.',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Carbon Footprint Calculator
  async calculateCarbonFootprint(farmData) {
    const systemPrompt = `You are an agricultural sustainability expert. Calculate the farm's carbon footprint based on the provided data. Respond ONLY with a JSON object with fields: total_co2_tons_per_year (number), breakdown (object with keys: crops, irrigation, fertilizers, machinery, livestock, other — each a number in tons CO2e), offset_potential_tons (number), carbon_credits_estimate_usd (number), reduction_recommendations (array of {action, potential_reduction_tons, cost_usd, roi_years}), sustainability_score (0-100), analysis (string).`;

    const prompt = `Farm Data:
Farm Size: ${farmData.farm_size || 'Unknown'} acres
Crops Grown: ${farmData.crops || 'Unknown'}
Irrigation Type: ${farmData.irrigation_type || 'Unknown'}
Annual Water Usage: ${farmData.water_usage || 'Unknown'} gallons
Fertilizer Usage: ${farmData.fertilizer_usage || 'Unknown'} lbs/acre
Machinery: ${farmData.machinery || 'Unknown'}
Livestock: ${farmData.livestock || 'None'}
Location: ${farmData.location || 'Unknown'}

Calculate carbon footprint and provide reduction recommendations.`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const content = response.choices?.[0]?.message?.content || '';
      const aiResult = parseAIJson(content) || {};

      return {
        success: true,
        ...aiResult,
        model: this.model,
        usage: response.usage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { success: false, error: error.message, timestamp: new Date().toISOString() };
    }
  }

  // Weekly Farm Report Generator
  async generateWeeklyReport(reportData) {
    const systemPrompt = `You are an agricultural report writer. Generate a comprehensive weekly farm report. Respond ONLY with a JSON object with fields: summary (string), highlights (array of strings), alerts (array of {level: 'info|warning|critical', message: string}), recommendations_this_week (array of strings), upcoming_tasks (array of {task, date, priority: 'low|medium|high'}), performance_summary (object with any relevant metrics), report_markdown (string - full formatted markdown report).`;

    const prompt = `Farm Weekly Report Data:
Week: ${reportData.week || new Date().toISOString().split('T')[0]}
Farm: ${JSON.stringify(reportData.farm || {})}
Active Diseases: ${JSON.stringify(reportData.diseases || [])}
Irrigation Records: ${JSON.stringify(reportData.irrigation || [])}
Harvest Predictions: ${JSON.stringify(reportData.harvest || [])}
Active Pests: ${JSON.stringify(reportData.pests || [])}
Recent Soil Analyses: ${JSON.stringify(reportData.soil || [])}
Weather Summary: ${JSON.stringify(reportData.weather || {})}

Generate a comprehensive weekly farm management report.`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const content = response.choices?.[0]?.message?.content || '';
      const aiResult = parseAIJson(content) || { report_markdown: content };

      return {
        success: true,
        ...aiResult,
        model: this.model,
        usage: response.usage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { success: false, error: error.message, timestamp: new Date().toISOString() };
    }
  }
}

module.exports = new OpenRouterService();
module.exports.parseAIJson = parseAIJson;
