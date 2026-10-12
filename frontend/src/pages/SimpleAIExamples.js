// Fictional text examples for the five native caller-supplied agriculture contracts.
// These are not observations, live feeds, diagnoses, or verified field records.
export const simpleAIExamples = {
  '/ai/disease-id-text': [
    { crop_type: 'Tomato', symptoms_description: 'Fictional training scenario: lower leaves have yellow areas and small brown rings. No real plant observation is supplied. Compare possible explanations and identify the checks needed before treatment.' },
    { crop_type: 'Wheat', symptoms_description: 'Fictional training scenario: a few leaf tips appear pale after dry weather. No measured nutrient or disease test is supplied. Identify missing evidence and a cautious inspection plan.' },
    { crop_type: 'Soybeans', symptoms_description: 'Fictional training scenario: uneven leaf coloration in a demonstration plot. Do not assume a confirmed pest or disease. Compare non-disease causes and verification steps.' },
  ],
  '/ai/irrigation-optimize-text': [
    { crop_type: 'Maize', snapshot: 'Fictional planning input, not a measured field snapshot: soil moisture 18%, crop stage V8, possible dry weather. Explain assumptions and checks before irrigation.' },
    { crop_type: 'Tomato', snapshot: 'Fictional planning input: soil moisture 24%, flowering stage, possible intermittent rain. Compare a conservative schedule and what actual measurements are needed.' },
    { crop_type: 'Wheat', snapshot: 'Fictional planning input: soil moisture 0 is a demonstration missing-sensor value, not a verified reading. Do not prescribe irrigation from this value; explain validation and uncertainty.' },
  ],
  '/ai/iot-sensor-summary': [
    { readings: 'Fictional training data; not readings from the selected field.\nmetric,value,unit\nsoil_moisture,22,percent\nair_temperature,18,C\nExplain limitations and checks before action.' },
    { readings: 'Fictional training data; not readings from the selected field.\nmetric,value,unit\nsoil_moisture,18,percent\nair_temperature,26,C\nCompare possible trends without claiming a live integration.' },
    { readings: 'Fictional training data; not readings from the selected field.\nmetric,value,unit\nsoil_moisture,0,percent\nair_temperature,0,C\nTreat zero as an unverified demonstration value and discuss sensor validation.' },
  ],
  '/ai/market-price-prediction': [
    { commodity: 'Maize', region: 'Example US Midwest market', horizon_days: 30, recent_prices: 'Fictional price series, not a live quote: week 1=4.80, week 2=4.92, week 3=4.88. Explain assumptions; this is a planning example.' },
    { commodity: 'Wheat', region: 'Example northern market', horizon_days: 60, recent_prices: 'Fictional price series: week 1=6.00, week 2=5.80, week 3=5.95. Compare plausible directions and limitations without inventing feed data.' },
    { commodity: 'Soybeans', region: 'Example central market', horizon_days: 90, recent_prices: 'Fictional price series: week 1=12.00, week 2=12.00, week 3=12.00. Consider a flat scenario and explain what verified data would change the conclusion.' },
  ],
  '/ai/sustainability-score': [
    { farm_summary: 'Fictional planning example: 10 hectares, maize rotation, cover crops, supplemental irrigation, no measured emissions or soil results. Explain missing evidence; do not treat this as a certified sustainability assessment.' },
    { farm_summary: 'Fictional planning example: 25 hectares, wheat rotation, rain-fed production, proposed buffer strips. No verified audit is supplied. Identify assumptions and feasible evidence collection steps.' },
    { farm_summary: 'Fictional planning example: 40 hectares, soybean rotation, mixed energy sources, soil and water measurements unavailable. Compare priorities with explicit uncertainty; no certification or verified score is asserted.' },
  ],
};
export const simpleAISourceKeys = new Set(['symptoms_description', 'snapshot', 'readings', 'farm_summary', 'recent_prices']);
