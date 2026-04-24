const https = require('https');
require('dotenv').config();

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
    this.baseUrl = 'openrouter.ai';
  }

  async makeRequest(prompt, systemPrompt = '') {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: this.model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: 10000,
        temperature: 0.7
      });

      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'http://localhost:3001',
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

  // Crop Disease Detection
  async analyzeCropDisease(cropData) {
    const systemPrompt = `You are an expert agricultural AI assistant specializing in crop disease detection and treatment. Provide detailed, actionable advice based on the symptoms and crop information provided. Always structure your response with clear sections for diagnosis, severity assessment, treatment recommendations, and prevention tips.`;

    const prompt = `Analyze the following crop for potential diseases:

Crop: ${cropData.crop_name}
Symptoms: ${cropData.symptoms}
Location: ${cropData.location || 'Not specified'}
${cropData.additional_info ? `Additional Information: ${cropData.additional_info}` : ''}

Please provide:
1. **Likely Disease Diagnosis** - What disease(s) could be causing these symptoms
2. **Severity Assessment** - Rate from mild/moderate/severe with explanation
3. **Confidence Level** - How confident you are in this diagnosis (percentage)
4. **Treatment Recommendations** - Specific treatments and products to use
5. **Prevention Measures** - How to prevent future occurrences
6. **Immediate Actions** - What the farmer should do right now`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const content = response.choices?.[0]?.message?.content || 'Unable to analyze';

      return {
        success: true,
        analysis: content,
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

  // Irrigation Optimization
  async optimizeIrrigation(irrigationData) {
    const systemPrompt = `You are an expert agricultural AI assistant specializing in irrigation management and water optimization. Provide precise, data-driven recommendations for optimal water usage while maintaining crop health and maximizing efficiency.`;

    const prompt = `Analyze the following field and provide irrigation recommendations:

Field Name: ${irrigationData.field_name}
Crop Type: ${irrigationData.crop_type}
Field Size: ${irrigationData.field_size} ${irrigationData.field_size_unit || 'acres'}
Soil Type: ${irrigationData.soil_type || 'Not specified'}
Current Soil Moisture: ${irrigationData.current_moisture || 'Not measured'}%
Target Moisture: ${irrigationData.target_moisture || 'Not specified'}%
Current Weather: ${irrigationData.weather_condition || 'Not specified'}
Temperature: ${irrigationData.temperature || 'Not specified'}°F
Humidity: ${irrigationData.humidity || 'Not specified'}%
Last Irrigation: ${irrigationData.last_irrigation || 'Not specified'}

Please provide:
1. **Water Requirements** - Exact amount of water needed in gallons
2. **Irrigation Schedule** - When and how often to irrigate
3. **Efficiency Score** - Rate current setup efficiency (0-100)
4. **Optimization Tips** - How to improve water usage
5. **Weather Considerations** - How upcoming weather affects recommendations
6. **Cost Savings Potential** - Estimated water/cost savings`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const content = response.choices?.[0]?.message?.content || 'Unable to analyze';

      return {
        success: true,
        recommendation: content,
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

  // Harvest Prediction
  async predictHarvest(harvestData) {
    const systemPrompt = `You are an expert agricultural AI assistant specializing in yield prediction and harvest optimization. Provide accurate forecasts based on crop conditions, growth stages, and environmental factors.`;

    const prompt = `Predict the harvest for the following crop:

Field Name: ${harvestData.field_name}
Crop Type: ${harvestData.crop_type}
Field Size: ${harvestData.field_size} ${harvestData.field_size_unit || 'acres'}
Planting Date: ${harvestData.planting_date || 'Not specified'}
Current Growth Stage: ${harvestData.current_growth_stage || 'Not specified'}
Health Status: ${harvestData.health_status || 'Not specified'}
Weather Outlook: ${harvestData.weather_outlook || 'Not specified'}

Please provide:
1. **Expected Harvest Date** - Predicted date range for optimal harvest
2. **Yield Prediction** - Estimated yield in appropriate units (bushels/tons/lbs)
3. **Confidence Level** - How confident you are in this prediction (percentage)
4. **Quality Assessment** - Expected quality of the harvest
5. **Risk Factors** - Potential issues that could affect yield
6. **Market Timing** - Best time to sell based on market trends
7. **Revenue Estimate** - Potential revenue based on current market prices`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const content = response.choices?.[0]?.message?.content || 'Unable to analyze';

      return {
        success: true,
        prediction: content,
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

  // Pest Identification
  async identifyPest(pestData) {
    const systemPrompt = `You are an expert agricultural AI assistant specializing in pest identification and integrated pest management. Provide accurate pest identification and effective, environmentally-conscious treatment options.`;

    const prompt = `Identify and provide management recommendations for the following pest issue:

Affected Crop: ${pestData.affected_crop}
Symptoms/Signs: ${pestData.symptoms || 'Not specified'}
Location: ${pestData.location || 'Not specified'}
Severity: ${pestData.severity || 'Not assessed'}
${pestData.additional_info ? `Additional Information: ${pestData.additional_info}` : ''}

Please provide:
1. **Pest Identification** - Most likely pest(s) causing the damage
2. **Pest Type** - Classification (insect, mite, rodent, etc.)
3. **Confidence Score** - How confident you are in this identification (percentage)
4. **Infestation Level** - Assessment of severity (low/medium/high/critical)
5. **Treatment Options** - Both organic and chemical solutions
6. **Prevention Measures** - How to prevent future infestations
7. **Natural Predators** - Beneficial insects/animals that can help
8. **Immediate Actions** - What to do right now`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const content = response.choices?.[0]?.message?.content || 'Unable to analyze';

      return {
        success: true,
        identification: content,
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

  // Soil Analysis
  async analyzeSoil(soilData) {
    const systemPrompt = `You are an expert agricultural AI assistant specializing in soil science and fertility management. Provide comprehensive soil health assessments and actionable recommendations for improving soil quality and crop productivity.`;

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

Please provide:
1. **Overall Health Score** - Rate soil health from 0-100
2. **Nutrient Analysis** - Detailed breakdown of nutrient levels (deficient/adequate/excessive)
3. **pH Assessment** - Is pH optimal? What adjustments are needed?
4. **Suitable Crops** - Best crops for this soil type
5. **Fertilizer Recommendations** - Specific fertilizers and application rates
6. **Soil Amendments** - Other amendments to improve soil health
7. **Long-term Improvement Plan** - Steps to improve soil over time
8. **Potential Issues** - Problems to watch out for`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const content = response.choices?.[0]?.message?.content || 'Unable to analyze';

      return {
        success: true,
        analysis: content,
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
}

module.exports = new OpenRouterService();
