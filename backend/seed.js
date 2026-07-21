const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ai_agriculture',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function seed() {
  if (process.env.RESET_DATABASE !== '1' || process.env.SEED_DEMO_DATA !== '1') {
    throw new Error('Refusing destructive seed: set RESET_DATABASE=1 and SEED_DEMO_DATA=1 explicitly');
  }
  if (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required');
  }
  console.log('Starting database seeding...');

  try {
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'config', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Schema created successfully');

    // Create demo user (admin)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, salt);

    const userResult = await pool.query(
      `INSERT INTO users (email, password, name, phone, farm_name, farm_size, location, bio, role, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO UPDATE SET password = $2, role = $9
       RETURNING id`,
      [
        process.env.SEED_ADMIN_EMAIL,
        hashedPassword,
        'Demo User',
        '+1-555-0123',
        'Green Valley Farm',
        250,
        'Central Valley, California',
        'Experienced farmer leveraging AI technology for sustainable agriculture. Managing 250 acres of diverse crops.',
        'admin',
        true
      ]
    );
    const userId = userResult.rows[0].id;
    console.log('Demo user created with ID:', userId);

    // Seed User Settings
    await pool.query(
      `INSERT INTO user_settings (user_id, theme, language, notifications_enabled, email_notifications, units, dashboard_layout)
       VALUES ($1, 'light', 'en', true, true, 'imperial', 'grid')
       ON CONFLICT (user_id) DO UPDATE SET theme = 'light'`,
      [userId]
    );
    console.log('Seeded user settings');

    // Seed Crop Diseases (16 items)
    const cropDiseases = [
      { crop_name: 'Tomato', disease_name: 'Early Blight', symptoms: 'Dark brown spots with concentric rings on lower leaves', severity: 'moderate', location: 'Field A', confidence_score: 87 },
      { crop_name: 'Tomato', disease_name: 'Late Blight', symptoms: 'Water-soaked spots that turn brown, white mold on underside', severity: 'severe', location: 'Field A', confidence_score: 92 },
      { crop_name: 'Wheat', disease_name: 'Powdery Mildew', symptoms: 'White powdery coating on leaves and stems', severity: 'mild', location: 'Field B', confidence_score: 95 },
      { crop_name: 'Corn', disease_name: 'Gray Leaf Spot', symptoms: 'Rectangular gray to tan lesions on leaves', severity: 'moderate', location: 'Field C', confidence_score: 88 },
      { crop_name: 'Potato', disease_name: 'Black Leg', symptoms: 'Black discoloration of stem base, wilting', severity: 'severe', location: 'Field D', confidence_score: 85 },
      { crop_name: 'Apple', disease_name: 'Apple Scab', symptoms: 'Olive-green to black spots on leaves and fruit', severity: 'moderate', location: 'Orchard 1', confidence_score: 91 },
      { crop_name: 'Grape', disease_name: 'Downy Mildew', symptoms: 'Yellow spots on upper leaf surface, white growth below', severity: 'moderate', location: 'Vineyard', confidence_score: 89 },
      { crop_name: 'Rice', disease_name: 'Blast', symptoms: 'Diamond-shaped lesions with gray centers', severity: 'severe', location: 'Paddy 1', confidence_score: 93 },
      { crop_name: 'Soybean', disease_name: 'Sudden Death Syndrome', symptoms: 'Interveinal chlorosis and necrosis on leaves', severity: 'severe', location: 'Field E', confidence_score: 86 },
      { crop_name: 'Cotton', disease_name: 'Verticillium Wilt', symptoms: 'Yellowing between leaf veins, leaf drop', severity: 'moderate', location: 'Field F', confidence_score: 84 },
      { crop_name: 'Cucumber', disease_name: 'Anthracnose', symptoms: 'Circular brown spots with dark borders', severity: 'mild', location: 'Greenhouse 1', confidence_score: 90 },
      { crop_name: 'Pepper', disease_name: 'Bacterial Spot', symptoms: 'Small dark raised spots on leaves and fruit', severity: 'moderate', location: 'Field G', confidence_score: 87 },
      { crop_name: 'Strawberry', disease_name: 'Gray Mold', symptoms: 'Gray fuzzy mold on fruit and flowers', severity: 'severe', location: 'Berry Farm', confidence_score: 94 },
      { crop_name: 'Lettuce', disease_name: 'Downy Mildew', symptoms: 'Yellow patches on leaves, white spores underneath', severity: 'moderate', location: 'Field H', confidence_score: 88 },
      { crop_name: 'Onion', disease_name: 'Botrytis Neck Rot', symptoms: 'Gray mold at neck, soft tissue', severity: 'moderate', location: 'Field I', confidence_score: 82 },
      { crop_name: 'Carrot', disease_name: 'Alternaria Leaf Blight', symptoms: 'Dark brown to black lesions on leaves', severity: 'mild', location: 'Field J', confidence_score: 85 }
    ];

    for (const disease of cropDiseases) {
      await pool.query(
        `INSERT INTO crop_diseases (user_id, crop_name, disease_name, symptoms, severity, location, confidence_score, ai_diagnosis, treatment_recommendations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, disease.crop_name, disease.disease_name, disease.symptoms, disease.severity, disease.location, disease.confidence_score,
         `AI Analysis for ${disease.disease_name}: This appears to be ${disease.disease_name} affecting ${disease.crop_name}. Based on the symptoms described (${disease.symptoms}), confidence is ${disease.confidence_score}%.`,
         `Treatment: Apply appropriate fungicide, improve air circulation, remove affected leaves, rotate crops next season.`]
      );
    }
    console.log(`Seeded ${cropDiseases.length} crop disease records`);

    // Seed Irrigation Records (16 items)
    const irrigationRecords = [
      { field_name: 'North Field', crop_type: 'Corn', field_size: 50, soil_type: 'Clay Loam', current_moisture: 35, target_moisture: 60, weather_condition: 'Sunny', temperature: 82, humidity: 45 },
      { field_name: 'South Field', crop_type: 'Wheat', field_size: 75, soil_type: 'Sandy Loam', current_moisture: 28, target_moisture: 55, weather_condition: 'Partly Cloudy', temperature: 78, humidity: 50 },
      { field_name: 'East Meadow', crop_type: 'Soybeans', field_size: 40, soil_type: 'Silt Loam', current_moisture: 42, target_moisture: 65, weather_condition: 'Cloudy', temperature: 75, humidity: 60 },
      { field_name: 'West Plains', crop_type: 'Cotton', field_size: 100, soil_type: 'Sandy', current_moisture: 22, target_moisture: 50, weather_condition: 'Sunny', temperature: 90, humidity: 35 },
      { field_name: 'Riverside Plot', crop_type: 'Rice', field_size: 30, soil_type: 'Clay', current_moisture: 70, target_moisture: 85, weather_condition: 'Rainy', temperature: 72, humidity: 80 },
      { field_name: 'Hilltop Farm', crop_type: 'Potatoes', field_size: 25, soil_type: 'Loam', current_moisture: 38, target_moisture: 55, weather_condition: 'Sunny', temperature: 68, humidity: 45 },
      { field_name: 'Valley Gardens', crop_type: 'Tomatoes', field_size: 15, soil_type: 'Rich Loam', current_moisture: 45, target_moisture: 70, weather_condition: 'Partly Cloudy', temperature: 80, humidity: 55 },
      { field_name: 'Orchard Zone A', crop_type: 'Apples', field_size: 20, soil_type: 'Loam', current_moisture: 40, target_moisture: 60, weather_condition: 'Sunny', temperature: 75, humidity: 50 },
      { field_name: 'Orchard Zone B', crop_type: 'Oranges', field_size: 25, soil_type: 'Sandy Loam', current_moisture: 32, target_moisture: 55, weather_condition: 'Sunny', temperature: 85, humidity: 40 },
      { field_name: 'Vineyard Main', crop_type: 'Grapes', field_size: 35, soil_type: 'Rocky Loam', current_moisture: 30, target_moisture: 50, weather_condition: 'Sunny', temperature: 88, humidity: 35 },
      { field_name: 'Greenhouse 1', crop_type: 'Lettuce', field_size: 2, soil_type: 'Potting Mix', current_moisture: 55, target_moisture: 75, weather_condition: 'Controlled', temperature: 70, humidity: 65 },
      { field_name: 'Greenhouse 2', crop_type: 'Peppers', field_size: 2, soil_type: 'Potting Mix', current_moisture: 48, target_moisture: 70, weather_condition: 'Controlled', temperature: 75, humidity: 60 },
      { field_name: 'Berry Patch', crop_type: 'Strawberries', field_size: 10, soil_type: 'Sandy Loam', current_moisture: 50, target_moisture: 65, weather_condition: 'Partly Cloudy', temperature: 72, humidity: 55 },
      { field_name: 'Root Cellar Field', crop_type: 'Carrots', field_size: 12, soil_type: 'Sandy', current_moisture: 35, target_moisture: 50, weather_condition: 'Sunny', temperature: 70, humidity: 45 },
      { field_name: 'Onion Beds', crop_type: 'Onions', field_size: 8, soil_type: 'Loam', current_moisture: 30, target_moisture: 45, weather_condition: 'Sunny', temperature: 78, humidity: 40 },
      { field_name: 'Squash Garden', crop_type: 'Squash', field_size: 5, soil_type: 'Rich Loam', current_moisture: 42, target_moisture: 60, weather_condition: 'Partly Cloudy', temperature: 82, humidity: 50 }
    ];

    for (const record of irrigationRecords) {
      await pool.query(
        `INSERT INTO irrigation_records (user_id, field_name, crop_type, field_size, soil_type, current_moisture, target_moisture, weather_condition, temperature, humidity, ai_recommendation, efficiency_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [userId, record.field_name, record.crop_type, record.field_size, record.soil_type, record.current_moisture, record.target_moisture, record.weather_condition, record.temperature, record.humidity,
         `AI Recommendation for ${record.field_name}: Based on current moisture (${record.current_moisture}%) and target (${record.target_moisture}%), recommend irrigation of approximately ${Math.round((record.target_moisture - record.current_moisture) * record.field_size * 27)} gallons.`,
         Math.floor(Math.random() * 30) + 65]
      );
    }
    console.log(`Seeded ${irrigationRecords.length} irrigation records`);

    // Seed Harvest Predictions (16 items)
    const harvestPredictions = [
      { field_name: 'North Field', crop_type: 'Corn', field_size: 50, planting_date: '2025-04-15', current_growth_stage: 'Tasseling', health_status: 'Excellent', predicted_yield: 180, yield_unit: 'bushels/acre' },
      { field_name: 'South Field', crop_type: 'Wheat', field_size: 75, planting_date: '2024-10-01', current_growth_stage: 'Heading', health_status: 'Good', predicted_yield: 55, yield_unit: 'bushels/acre' },
      { field_name: 'East Meadow', crop_type: 'Soybeans', field_size: 40, planting_date: '2025-05-10', current_growth_stage: 'Flowering', health_status: 'Good', predicted_yield: 48, yield_unit: 'bushels/acre' },
      { field_name: 'West Plains', crop_type: 'Cotton', field_size: 100, planting_date: '2025-04-20', current_growth_stage: 'Boll Development', health_status: 'Fair', predicted_yield: 850, yield_unit: 'lbs/acre' },
      { field_name: 'Valley Gardens', crop_type: 'Tomatoes', field_size: 15, planting_date: '2025-03-15', current_growth_stage: 'Fruiting', health_status: 'Excellent', predicted_yield: 35, yield_unit: 'tons/acre' },
      { field_name: 'Hilltop Farm', crop_type: 'Potatoes', field_size: 25, planting_date: '2025-04-01', current_growth_stage: 'Tuber Bulking', health_status: 'Good', predicted_yield: 400, yield_unit: 'cwt/acre' },
      { field_name: 'Orchard Zone A', crop_type: 'Apples', field_size: 20, planting_date: '2020-03-01', current_growth_stage: 'Fruit Maturation', health_status: 'Excellent', predicted_yield: 800, yield_unit: 'bushels' },
      { field_name: 'Orchard Zone B', crop_type: 'Oranges', field_size: 25, planting_date: '2018-02-15', current_growth_stage: 'Fruit Development', health_status: 'Good', predicted_yield: 320, yield_unit: 'boxes/acre' },
      { field_name: 'Vineyard Main', crop_type: 'Grapes', field_size: 35, planting_date: '2019-03-20', current_growth_stage: 'Veraison', health_status: 'Excellent', predicted_yield: 6, yield_unit: 'tons/acre' },
      { field_name: 'Berry Patch', crop_type: 'Strawberries', field_size: 10, planting_date: '2025-02-01', current_growth_stage: 'Fruiting', health_status: 'Good', predicted_yield: 20000, yield_unit: 'lbs/acre' },
      { field_name: 'Greenhouse 1', crop_type: 'Lettuce', field_size: 2, planting_date: '2025-06-01', current_growth_stage: 'Head Formation', health_status: 'Excellent', predicted_yield: 25000, yield_unit: 'heads/acre' },
      { field_name: 'Greenhouse 2', crop_type: 'Peppers', field_size: 2, planting_date: '2025-04-15', current_growth_stage: 'Fruiting', health_status: 'Good', predicted_yield: 30000, yield_unit: 'lbs/acre' },
      { field_name: 'Root Cellar Field', crop_type: 'Carrots', field_size: 12, planting_date: '2025-04-10', current_growth_stage: 'Root Enlargement', health_status: 'Good', predicted_yield: 30, yield_unit: 'tons/acre' },
      { field_name: 'Onion Beds', crop_type: 'Onions', field_size: 8, planting_date: '2025-03-01', current_growth_stage: 'Bulb Development', health_status: 'Fair', predicted_yield: 450, yield_unit: 'cwt/acre' },
      { field_name: 'Squash Garden', crop_type: 'Squash', field_size: 5, planting_date: '2025-05-15', current_growth_stage: 'Fruit Set', health_status: 'Good', predicted_yield: 25, yield_unit: 'tons/acre' },
      { field_name: 'Riverside Plot', crop_type: 'Rice', field_size: 30, planting_date: '2025-04-01', current_growth_stage: 'Heading', health_status: 'Excellent', predicted_yield: 7500, yield_unit: 'lbs/acre' }
    ];

    for (const prediction of harvestPredictions) {
      const harvestDate = new Date(prediction.planting_date);
      harvestDate.setMonth(harvestDate.getMonth() + 4);
      await pool.query(
        `INSERT INTO harvest_predictions (user_id, field_name, crop_type, field_size, planting_date, expected_harvest_date, current_growth_stage, health_status, predicted_yield, yield_unit, ai_prediction, confidence_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [userId, prediction.field_name, prediction.crop_type, prediction.field_size, prediction.planting_date, harvestDate.toISOString().split('T')[0], prediction.current_growth_stage, prediction.health_status, prediction.predicted_yield, prediction.yield_unit,
         `AI Harvest Prediction for ${prediction.crop_type} in ${prediction.field_name}: Expected yield approximately ${prediction.predicted_yield} ${prediction.yield_unit}. Optimal harvest window projected for ${harvestDate.toDateString()}.`,
         Math.floor(Math.random() * 20) + 75]
      );
    }
    console.log(`Seeded ${harvestPredictions.length} harvest predictions`);

    // Seed Pest Identifications (16 items)
    const pestIdentifications = [
      { pest_name: 'Aphids', pest_type: 'Insect', affected_crop: 'Tomatoes', location: 'Valley Gardens', severity: 'moderate', symptoms: 'Curled leaves, sticky residue, stunted growth', infestation_level: 'medium' },
      { pest_name: 'Japanese Beetles', pest_type: 'Insect', affected_crop: 'Grapes', location: 'Vineyard Main', severity: 'severe', symptoms: 'Skeletonized leaves, damaged fruit', infestation_level: 'high' },
      { pest_name: 'Corn Earworm', pest_type: 'Insect', affected_crop: 'Corn', location: 'North Field', severity: 'moderate', symptoms: 'Holes in ears, frass present', infestation_level: 'medium' },
      { pest_name: 'Colorado Potato Beetle', pest_type: 'Insect', affected_crop: 'Potatoes', location: 'Hilltop Farm', severity: 'severe', symptoms: 'Defoliated plants, orange eggs on leaves', infestation_level: 'high' },
      { pest_name: 'Spider Mites', pest_type: 'Arachnid', affected_crop: 'Strawberries', location: 'Berry Patch', severity: 'mild', symptoms: 'Stippled leaves, fine webbing', infestation_level: 'low' },
      { pest_name: 'Whiteflies', pest_type: 'Insect', affected_crop: 'Peppers', location: 'Greenhouse 2', severity: 'moderate', symptoms: 'Yellow leaves, white insects flying when disturbed', infestation_level: 'medium' },
      { pest_name: 'Cabbage Looper', pest_type: 'Insect', affected_crop: 'Lettuce', location: 'Greenhouse 1', severity: 'mild', symptoms: 'Irregular holes in leaves, green caterpillars', infestation_level: 'low' },
      { pest_name: 'Carrot Rust Fly', pest_type: 'Insect', affected_crop: 'Carrots', location: 'Root Cellar Field', severity: 'moderate', symptoms: 'Tunnels in roots, wilting plants', infestation_level: 'medium' },
      { pest_name: 'Onion Thrips', pest_type: 'Insect', affected_crop: 'Onions', location: 'Onion Beds', severity: 'moderate', symptoms: 'Silver streaks on leaves, distorted growth', infestation_level: 'medium' },
      { pest_name: 'Squash Bug', pest_type: 'Insect', affected_crop: 'Squash', location: 'Squash Garden', severity: 'severe', symptoms: 'Wilting vines, bronze eggs on leaves', infestation_level: 'high' },
      { pest_name: 'Cotton Bollworm', pest_type: 'Insect', affected_crop: 'Cotton', location: 'West Plains', severity: 'severe', symptoms: 'Damaged bolls, holes in squares', infestation_level: 'high' },
      { pest_name: 'Soybean Aphid', pest_type: 'Insect', affected_crop: 'Soybeans', location: 'East Meadow', severity: 'moderate', symptoms: 'Honeydew, sooty mold, yellow leaves', infestation_level: 'medium' },
      { pest_name: 'Codling Moth', pest_type: 'Insect', affected_crop: 'Apples', location: 'Orchard Zone A', severity: 'severe', symptoms: 'Wormy fruit, entry holes with frass', infestation_level: 'high' },
      { pest_name: 'Citrus Leafminer', pest_type: 'Insect', affected_crop: 'Oranges', location: 'Orchard Zone B', severity: 'mild', symptoms: 'Serpentine mines in leaves, distorted growth', infestation_level: 'low' },
      { pest_name: 'Rice Water Weevil', pest_type: 'Insect', affected_crop: 'Rice', location: 'Riverside Plot', severity: 'moderate', symptoms: 'Scarred leaves, root damage', infestation_level: 'medium' },
      { pest_name: 'Wheat Midge', pest_type: 'Insect', affected_crop: 'Wheat', location: 'South Field', severity: 'mild', symptoms: 'Shriveled kernels, orange larvae', infestation_level: 'low' }
    ];

    for (const pest of pestIdentifications) {
      await pool.query(
        `INSERT INTO pest_identifications (user_id, pest_name, pest_type, affected_crop, location, severity, symptoms, infestation_level, ai_identification, confidence_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [userId, pest.pest_name, pest.pest_type, pest.affected_crop, pest.location, pest.severity, pest.symptoms, pest.infestation_level,
         `AI Pest Identification: ${pest.pest_name} (${pest.pest_type}) detected on ${pest.affected_crop}. Symptoms: ${pest.symptoms}. Infestation: ${pest.infestation_level}. Treatment: Apply appropriate controls and implement crop rotation.`,
         Math.floor(Math.random() * 15) + 80]
      );
    }
    console.log(`Seeded ${pestIdentifications.length} pest identifications`);

    // Seed Soil Analyses (16 items)
    const soilAnalyses = [
      { field_name: 'North Field', sample_location: 'Center', ph_level: 6.5, nitrogen_level: 45, phosphorus_level: 30, potassium_level: 180, organic_matter: 3.5, soil_texture: 'Clay Loam', moisture_content: 28 },
      { field_name: 'South Field', sample_location: 'Northwest Corner', ph_level: 7.2, nitrogen_level: 35, phosphorus_level: 25, potassium_level: 150, organic_matter: 2.8, soil_texture: 'Sandy Loam', moisture_content: 22 },
      { field_name: 'East Meadow', sample_location: 'East Side', ph_level: 6.8, nitrogen_level: 50, phosphorus_level: 35, potassium_level: 200, organic_matter: 4.2, soil_texture: 'Silt Loam', moisture_content: 32 },
      { field_name: 'West Plains', sample_location: 'South Section', ph_level: 7.5, nitrogen_level: 25, phosphorus_level: 18, potassium_level: 120, organic_matter: 1.8, soil_texture: 'Sandy', moisture_content: 15 },
      { field_name: 'Valley Gardens', sample_location: 'Main Plot', ph_level: 6.2, nitrogen_level: 60, phosphorus_level: 45, potassium_level: 220, organic_matter: 5.5, soil_texture: 'Rich Loam', moisture_content: 35 },
      { field_name: 'Hilltop Farm', sample_location: 'Hilltop', ph_level: 6.0, nitrogen_level: 40, phosphorus_level: 28, potassium_level: 165, organic_matter: 3.2, soil_texture: 'Loam', moisture_content: 25 },
      { field_name: 'Orchard Zone A', sample_location: 'Tree Row 5', ph_level: 6.4, nitrogen_level: 55, phosphorus_level: 40, potassium_level: 190, organic_matter: 4.0, soil_texture: 'Loam', moisture_content: 30 },
      { field_name: 'Orchard Zone B', sample_location: 'Tree Row 3', ph_level: 6.7, nitrogen_level: 42, phosphorus_level: 32, potassium_level: 175, organic_matter: 3.0, soil_texture: 'Sandy Loam', moisture_content: 24 },
      { field_name: 'Vineyard Main', sample_location: 'Vine Row 10', ph_level: 7.0, nitrogen_level: 30, phosphorus_level: 22, potassium_level: 145, organic_matter: 2.5, soil_texture: 'Rocky Loam', moisture_content: 20 },
      { field_name: 'Berry Patch', sample_location: 'Center Bed', ph_level: 5.8, nitrogen_level: 48, phosphorus_level: 38, potassium_level: 185, organic_matter: 4.5, soil_texture: 'Sandy Loam', moisture_content: 28 },
      { field_name: 'Greenhouse 1', sample_location: 'Bed A', ph_level: 6.3, nitrogen_level: 70, phosphorus_level: 55, potassium_level: 240, organic_matter: 6.0, soil_texture: 'Potting Mix', moisture_content: 45 },
      { field_name: 'Greenhouse 2', sample_location: 'Bed B', ph_level: 6.5, nitrogen_level: 65, phosphorus_level: 50, potassium_level: 230, organic_matter: 5.8, soil_texture: 'Potting Mix', moisture_content: 42 },
      { field_name: 'Root Cellar Field', sample_location: 'Row 1', ph_level: 6.6, nitrogen_level: 38, phosphorus_level: 26, potassium_level: 155, organic_matter: 2.6, soil_texture: 'Sandy', moisture_content: 18 },
      { field_name: 'Onion Beds', sample_location: 'Bed Center', ph_level: 6.8, nitrogen_level: 35, phosphorus_level: 28, potassium_level: 160, organic_matter: 3.0, soil_texture: 'Loam', moisture_content: 22 },
      { field_name: 'Squash Garden', sample_location: 'Main Area', ph_level: 6.4, nitrogen_level: 52, phosphorus_level: 42, potassium_level: 195, organic_matter: 4.8, soil_texture: 'Rich Loam', moisture_content: 32 },
      { field_name: 'Riverside Plot', sample_location: 'Paddy Center', ph_level: 5.5, nitrogen_level: 58, phosphorus_level: 48, potassium_level: 210, organic_matter: 5.2, soil_texture: 'Clay', moisture_content: 55 }
    ];

    for (const soil of soilAnalyses) {
      const healthScore = Math.min(100, Math.round((soil.nitrogen_level / 60 + soil.phosphorus_level / 50 + soil.potassium_level / 200 + soil.organic_matter / 5) * 25));
      await pool.query(
        `INSERT INTO soil_analyses (user_id, field_name, sample_location, ph_level, nitrogen_level, phosphorus_level, potassium_level, organic_matter, soil_texture, moisture_content, ai_analysis, health_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [userId, soil.field_name, soil.sample_location, soil.ph_level, soil.nitrogen_level, soil.phosphorus_level, soil.potassium_level, soil.organic_matter, soil.soil_texture, soil.moisture_content,
         `AI Soil Analysis for ${soil.field_name}: pH ${soil.ph_level} (${soil.ph_level < 6.0 ? 'acidic' : soil.ph_level > 7.5 ? 'alkaline' : 'optimal'}). NPK: N:${soil.nitrogen_level}ppm, P:${soil.phosphorus_level}ppm, K:${soil.potassium_level}ppm. Organic matter: ${soil.organic_matter}%. Health score: ${healthScore}/100.`,
         healthScore]
      );
    }
    console.log(`Seeded ${soilAnalyses.length} soil analyses`);

    // Seed Notifications (16 items)
    const notifications = [
      { title: 'Irrigation Alert: North Field', message: 'Soil moisture in North Field has dropped below 30%. Immediate irrigation recommended.', type: 'warning', category: 'irrigation' },
      { title: 'Pest Warning: Japanese Beetles', message: 'High infestation of Japanese Beetles detected in Vineyard Main. Treatment needed urgently.', type: 'error', category: 'pest' },
      { title: 'Harvest Reminder: Tomatoes', message: 'Tomatoes in Valley Gardens are approaching optimal harvest window. Plan harvesting within 5 days.', type: 'info', category: 'harvest' },
      { title: 'Weather Alert: Frost Warning', message: 'Frost expected overnight. Protect sensitive crops in Greenhouse 1 and Berry Patch.', type: 'warning', category: 'weather' },
      { title: 'Soil Analysis Complete', message: 'AI soil analysis for East Meadow is complete. Health score: 82/100. View recommendations.', type: 'success', category: 'soil' },
      { title: 'Disease Detected: Late Blight', message: 'Late Blight confirmed on tomatoes in Field A. Severity: severe. Immediate action required.', type: 'error', category: 'disease' },
      { title: 'Weekly Farm Report', message: 'Your weekly farm performance report is ready. Overall efficiency: 78%. View detailed breakdown.', type: 'info', category: 'system' },
      { title: 'Irrigation Scheduled', message: 'Automated irrigation for South Field scheduled for tomorrow at 6:00 AM. Est. 2,500 gallons.', type: 'info', category: 'irrigation' },
      { title: 'New AI Feature Available', message: 'Enhanced pest identification model now available with 95% accuracy. Try it on your latest observations.', type: 'info', category: 'system' },
      { title: 'Crop Growth Update', message: 'Corn in North Field has entered tasseling stage. Expected yield updated to 180 bushels/acre.', type: 'success', category: 'harvest' },
      { title: 'Equipment Maintenance Due', message: 'Drip irrigation system in Greenhouse 1 is due for maintenance check. Schedule inspection.', type: 'warning', category: 'irrigation' },
      { title: 'Pest Treatment Effective', message: 'Spider mite treatment in Berry Patch showing positive results. Infestation reduced by 60%.', type: 'success', category: 'pest' },
      { title: 'Market Price Alert', message: 'Wheat futures up 8% this week. Consider adjusting harvest timing for South Field.', type: 'info', category: 'harvest' },
      { title: 'Rain Forecast', message: 'Significant rainfall expected in the next 48 hours. Adjust irrigation schedules accordingly.', type: 'info', category: 'weather' },
      { title: 'Soil pH Warning', message: 'Riverside Plot soil pH has dropped to 5.5. Consider lime application to improve alkalinity.', type: 'warning', category: 'soil' },
      { title: 'Season Planning Reminder', message: 'Time to plan crop rotation for next season. Review AI recommendations for optimal field assignments.', type: 'info', category: 'system' }
    ];

    for (const notif of notifications) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, category)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, notif.title, notif.message, notif.type, notif.category]
      );
    }
    console.log(`Seeded ${notifications.length} notifications`);

    // Seed Audit Logs (16 items)
    const auditLogs = [
      { action: 'login', entity_type: 'auth', changes: { method: 'password' } },
      { action: 'create', entity_type: 'crop_disease', changes: { crop_name: 'Tomato', disease: 'Early Blight' } },
      { action: 'update', entity_type: 'irrigation', changes: { field: 'North Field', moisture_adjusted: true } },
      { action: 'create', entity_type: 'harvest_prediction', changes: { crop: 'Corn', field: 'North Field' } },
      { action: 'delete', entity_type: 'pest_identification', changes: { pest: 'Old Record', reason: 'duplicate' } },
      { action: 'create', entity_type: 'soil_analysis', changes: { field: 'East Meadow', ph: 6.8 } },
      { action: 'update', entity_type: 'user_profile', changes: { field: 'farm_size', old: 200, new: 250 } },
      { action: 'update', entity_type: 'settings', changes: { theme: 'light', notifications: true } },
      { action: 'create', entity_type: 'feedback', changes: { type: 'feature', subject: 'Mobile App' } },
      { action: 'export', entity_type: 'crop_diseases', changes: { format: 'csv', records: 16 } },
      { action: 'login', entity_type: 'auth', changes: { method: 'demo_credentials' } },
      { action: 'create', entity_type: 'field_location', changes: { name: 'North Field', lat: 38.5, lng: -121.5 } },
      { action: 'upload', entity_type: 'file', changes: { filename: 'crop_photo.jpg', size: '2.4MB' } },
      { action: 'update', entity_type: 'irrigation', changes: { field: 'Vineyard Main', schedule_changed: true } },
      { action: 'create', entity_type: 'notification', changes: { type: 'alert', category: 'weather' } },
      { action: 'search', entity_type: 'global', changes: { query: 'tomato blight', results: 5 } }
    ];

    for (const log of auditLogs) {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, changes, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, log.action, log.entity_type, JSON.stringify(log.changes), '127.0.0.1']
      );
    }
    console.log(`Seeded ${auditLogs.length} audit logs`);

    // Seed Feedback (16 items)
    const feedbackItems = [
      { type: 'feature', subject: 'Mobile App Support', message: 'Would love to have a native mobile app for field inspections. Being able to take photos and get instant AI analysis while in the field would be incredibly useful.', rating: 4, status: 'open' },
      { type: 'bug', subject: 'Irrigation Schedule Timezone Issue', message: 'The irrigation schedule shows times in UTC instead of my local timezone. This causes confusion when planning morning irrigations.', rating: 3, status: 'in_progress' },
      { type: 'general', subject: 'Great AI Disease Detection', message: 'The crop disease detection feature correctly identified powdery mildew on my wheat crop. The treatment recommendations were spot-on. Thank you!', rating: 5, status: 'resolved' },
      { type: 'feature', subject: 'Multi-Farm Support', message: 'I manage three different farm locations. Would be great to switch between farms without creating separate accounts.', rating: 4, status: 'open' },
      { type: 'improvement', subject: 'Soil Analysis Report Format', message: 'The soil analysis AI output could be improved with more visual charts showing nutrient levels. A radar chart for NPK would be helpful.', rating: 4, status: 'open' },
      { type: 'bug', subject: 'Export CSV Encoding Issue', message: 'When exporting crop disease data to CSV, special characters in field names get corrupted. Happens with UTF-8 characters.', rating: 2, status: 'in_progress' },
      { type: 'general', subject: 'Onboarding Experience', message: 'The demo credentials feature made it very easy to try out the platform before committing. Very user-friendly onboarding experience.', rating: 5, status: 'resolved' },
      { type: 'feature', subject: 'Drone Integration', message: 'Planning to use drones for field monitoring. Would be amazing to directly upload drone imagery for AI analysis of large field areas.', rating: 4, status: 'open' },
      { type: 'improvement', subject: 'Weather Data Accuracy', message: 'The weather data seems to use a city-level location. Could we get more precise weather data based on exact GPS coordinates of each field?', rating: 3, status: 'open' },
      { type: 'general', subject: 'Pest Management Success', message: 'Used the AI pest identifier for aphids on my tomatoes. The integrated pest management advice was comprehensive and effective.', rating: 5, status: 'resolved' },
      { type: 'feature', subject: 'Automated Alerts via SMS', message: 'Email notifications are good, but SMS alerts for critical issues like pest outbreaks and frost warnings would be more immediate.', rating: 4, status: 'open' },
      { type: 'bug', subject: 'Harvest Date Calculation', message: 'For perennial crops like apples, the expected harvest date seems to calculate from the original planting date, which doesn\'t make sense.', rating: 3, status: 'in_progress' },
      { type: 'improvement', subject: 'Dashboard Customization', message: 'Would like to customize which metrics appear on my dashboard. I focus mainly on irrigation and soil, less on pest management.', rating: 4, status: 'open' },
      { type: 'general', subject: 'API Documentation', message: 'The API docs endpoint is very helpful for our custom integration. We are building a custom IoT soil sensor that reports data directly.', rating: 5, status: 'resolved' },
      { type: 'feature', subject: 'Historical Data Charts', message: 'Trend charts showing soil health, irrigation efficiency, and yield predictions over time would help identify long-term patterns.', rating: 4, status: 'open' },
      { type: 'improvement', subject: 'Bulk Data Import', message: 'We have years of historical farm data in spreadsheets. A bulk import feature would save hours of manual data entry.', rating: 3, status: 'open' }
    ];

    for (const fb of feedbackItems) {
      await pool.query(
        `INSERT INTO feedback (user_id, type, subject, message, rating, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, fb.type, fb.subject, fb.message, fb.rating, fb.status]
      );
    }
    console.log(`Seeded ${feedbackItems.length} feedback records`);

    // Seed Uploaded Files (16 items - metadata only, no actual files)
    const uploadedFiles = [
      { filename: 'tomato_blight_001.jpg', original_name: 'tomato_blight_photo.jpg', mime_type: 'image/jpeg', file_size: 2457600, category: 'crop_disease', description: 'Late blight symptoms on tomato leaves - Field A' },
      { filename: 'soil_test_report.pdf', original_name: 'Lab_Soil_Analysis_2025.pdf', mime_type: 'application/pdf', file_size: 1048576, category: 'soil', description: 'Laboratory soil analysis report for East Meadow' },
      { filename: 'corn_field_aerial.jpg', original_name: 'drone_capture_north_field.jpg', mime_type: 'image/jpeg', file_size: 5120000, category: 'field', description: 'Aerial drone photo of North Field corn crop' },
      { filename: 'irrigation_schedule.csv', original_name: 'weekly_irrigation_plan.csv', mime_type: 'text/csv', file_size: 15360, category: 'irrigation', description: 'Weekly irrigation schedule for all fields' },
      { filename: 'pest_damage_grape.jpg', original_name: 'japanese_beetle_damage.jpg', mime_type: 'image/jpeg', file_size: 1843200, category: 'pest', description: 'Japanese beetle damage on grape vineyard leaves' },
      { filename: 'harvest_records_2024.xlsx', original_name: 'Annual_Harvest_2024.xlsx', mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', file_size: 307200, category: 'harvest', description: 'Previous year harvest records for all fields' },
      { filename: 'apple_scab_closeup.jpg', original_name: 'apple_scab_macro.jpg', mime_type: 'image/jpeg', file_size: 3072000, category: 'crop_disease', description: 'Close-up of apple scab on fruit surface' },
      { filename: 'weather_station_data.csv', original_name: 'field_weather_jan2025.csv', mime_type: 'text/csv', file_size: 51200, category: 'weather', description: 'On-field weather station data for January 2025' },
      { filename: 'greenhouse_layout.pdf', original_name: 'Greenhouse_1_Layout.pdf', mime_type: 'application/pdf', file_size: 2097152, category: 'field', description: 'Layout plan for Greenhouse 1 bed arrangement' },
      { filename: 'cotton_field_wide.jpg', original_name: 'west_plains_overview.jpg', mime_type: 'image/jpeg', file_size: 4096000, category: 'field', description: 'Wide angle view of cotton fields at West Plains' },
      { filename: 'nutrient_deficiency.jpg', original_name: 'soybean_chlorosis.jpg', mime_type: 'image/jpeg', file_size: 1536000, category: 'crop_disease', description: 'Soybean interveinal chlorosis showing nutrient deficiency' },
      { filename: 'farm_budget_2025.xlsx', original_name: 'Budget_Planning_2025.xlsx', mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', file_size: 204800, category: 'general', description: 'Annual farm budget and expense planning document' },
      { filename: 'strawberry_mites.jpg', original_name: 'spider_mite_damage.jpg', mime_type: 'image/jpeg', file_size: 2048000, category: 'pest', description: 'Spider mite webbing on strawberry plant leaves' },
      { filename: 'soil_ph_map.pdf', original_name: 'Field_pH_Mapping.pdf', mime_type: 'application/pdf', file_size: 3145728, category: 'soil', description: 'pH level mapping across all farm fields' },
      { filename: 'rice_paddy_water.jpg', original_name: 'riverside_flooding.jpg', mime_type: 'image/jpeg', file_size: 2560000, category: 'irrigation', description: 'Water level monitoring in riverside rice paddy' },
      { filename: 'crop_rotation_plan.pdf', original_name: 'Rotation_Plan_2025_2026.pdf', mime_type: 'application/pdf', file_size: 1572864, category: 'general', description: 'Two-year crop rotation planning document' }
    ];

    for (const file of uploadedFiles) {
      await pool.query(
        `INSERT INTO uploaded_files (user_id, filename, original_name, mime_type, file_size, file_path, category, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, file.filename, file.original_name, file.mime_type, file.file_size, `/uploads/${file.filename}`, file.category, file.description]
      );
    }
    console.log(`Seeded ${uploadedFiles.length} file upload records`);

    // Seed Weather Data (16 items)
    const weatherData = [
      { location_name: 'North Field', lat: 38.5816, lng: -121.4944, temperature: 82, humidity: 45, wind_speed: 8, condition: 'Sunny', description: 'Clear skies, hot afternoon expected' },
      { location_name: 'South Field', lat: 38.5656, lng: -121.5000, temperature: 78, humidity: 50, wind_speed: 12, condition: 'Partly Cloudy', description: 'Scattered clouds, mild temperatures' },
      { location_name: 'East Meadow', lat: 38.5900, lng: -121.4800, temperature: 75, humidity: 60, wind_speed: 6, condition: 'Cloudy', description: 'Overcast skies, possible light rain' },
      { location_name: 'West Plains', lat: 38.5700, lng: -121.5200, temperature: 90, humidity: 35, wind_speed: 15, condition: 'Hot & Dry', description: 'Heat advisory, increase irrigation' },
      { location_name: 'Riverside Plot', lat: 38.5500, lng: -121.4700, temperature: 72, humidity: 80, wind_speed: 4, condition: 'Foggy', description: 'Morning fog, clearing by noon' },
      { location_name: 'Valley Gardens', lat: 38.5750, lng: -121.4900, temperature: 80, humidity: 55, wind_speed: 10, condition: 'Warm', description: 'Pleasant growing conditions' },
      { location_name: 'Hilltop Farm', lat: 38.5950, lng: -121.5100, temperature: 68, humidity: 45, wind_speed: 18, condition: 'Windy', description: 'Strong winds from northwest, cooler temperatures' },
      { location_name: 'Orchard Zone A', lat: 38.5850, lng: -121.4850, temperature: 75, humidity: 50, wind_speed: 7, condition: 'Pleasant', description: 'Ideal conditions for fruit development' },
      { location_name: 'Orchard Zone B', lat: 38.5800, lng: -121.4750, temperature: 85, humidity: 40, wind_speed: 9, condition: 'Sunny', description: 'Warm and sunny, good for citrus' },
      { location_name: 'Vineyard Main', lat: 38.5600, lng: -121.5050, temperature: 88, humidity: 35, wind_speed: 5, condition: 'Hot', description: 'Hot day, watch for heat stress on vines' },
      { location_name: 'Greenhouse 1', lat: 38.5780, lng: -121.4920, temperature: 70, humidity: 65, wind_speed: 0, condition: 'Controlled', description: 'Climate controlled environment' },
      { location_name: 'Greenhouse 2', lat: 38.5782, lng: -121.4922, temperature: 75, humidity: 60, wind_speed: 0, condition: 'Controlled', description: 'Climate controlled, slightly warmer setting' },
      { location_name: 'Berry Patch', lat: 38.5720, lng: -121.4880, temperature: 72, humidity: 55, wind_speed: 8, condition: 'Mild', description: 'Perfect berry growing weather' },
      { location_name: 'Root Cellar Field', lat: 38.5680, lng: -121.4960, temperature: 70, humidity: 45, wind_speed: 11, condition: 'Clear', description: 'Clear and moderate temperatures' },
      { location_name: 'Onion Beds', lat: 38.5660, lng: -121.5020, temperature: 78, humidity: 40, wind_speed: 13, condition: 'Dry', description: 'Dry conditions, monitor soil moisture' },
      { location_name: 'Squash Garden', lat: 38.5740, lng: -121.4940, temperature: 82, humidity: 50, wind_speed: 7, condition: 'Warm & Humid', description: 'Warm with moderate humidity' }
    ];

    for (const w of weatherData) {
      await pool.query(
        `INSERT INTO weather_data (user_id, location_name, latitude, longitude, temperature, humidity, wind_speed, weather_condition, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, w.location_name, w.lat, w.lng, w.temperature, w.humidity, w.wind_speed, w.condition, w.description]
      );
    }
    console.log(`Seeded ${weatherData.length} weather data records`);

    // Seed Field Locations (16 items)
    const fieldLocations = [
      { name: 'North Field', description: 'Primary corn field, center-pivot irrigation', lat: 38.5816, lng: -121.4944, area_size: 50, crop_type: 'Corn', soil_type: 'Clay Loam', color: '#4caf50' },
      { name: 'South Field', description: 'Wheat cultivation area with drip irrigation', lat: 38.5656, lng: -121.5000, area_size: 75, crop_type: 'Wheat', soil_type: 'Sandy Loam', color: '#ffc107' },
      { name: 'East Meadow', description: 'Soybean rotation field, high organic matter', lat: 38.5900, lng: -121.4800, area_size: 40, crop_type: 'Soybeans', soil_type: 'Silt Loam', color: '#8bc34a' },
      { name: 'West Plains', description: 'Large cotton field, flood irrigation', lat: 38.5700, lng: -121.5200, area_size: 100, crop_type: 'Cotton', soil_type: 'Sandy', color: '#e0e0e0' },
      { name: 'Riverside Plot', description: 'Rice paddy along the river, naturally flooded', lat: 38.5500, lng: -121.4700, area_size: 30, crop_type: 'Rice', soil_type: 'Clay', color: '#00bcd4' },
      { name: 'Valley Gardens', description: 'Tomato cultivation with greenhouse support', lat: 38.5750, lng: -121.4900, area_size: 15, crop_type: 'Tomatoes', soil_type: 'Rich Loam', color: '#f44336' },
      { name: 'Hilltop Farm', description: 'Potato field on elevated terrain', lat: 38.5950, lng: -121.5100, area_size: 25, crop_type: 'Potatoes', soil_type: 'Loam', color: '#795548' },
      { name: 'Orchard Zone A', description: 'Apple orchard, mature trees', lat: 38.5850, lng: -121.4850, area_size: 20, crop_type: 'Apples', soil_type: 'Loam', color: '#e91e63' },
      { name: 'Orchard Zone B', description: 'Orange grove, subtropical section', lat: 38.5800, lng: -121.4750, area_size: 25, crop_type: 'Oranges', soil_type: 'Sandy Loam', color: '#ff9800' },
      { name: 'Vineyard Main', description: 'Wine grape vineyard, trellis system', lat: 38.5600, lng: -121.5050, area_size: 35, crop_type: 'Grapes', soil_type: 'Rocky Loam', color: '#9c27b0' },
      { name: 'Greenhouse 1', description: 'Year-round lettuce production', lat: 38.5780, lng: -121.4920, area_size: 2, crop_type: 'Lettuce', soil_type: 'Potting Mix', color: '#4caf50' },
      { name: 'Greenhouse 2', description: 'Pepper cultivation in controlled environment', lat: 38.5782, lng: -121.4922, area_size: 2, crop_type: 'Peppers', soil_type: 'Potting Mix', color: '#ff5722' },
      { name: 'Berry Patch', description: 'Strawberry beds with row covers', lat: 38.5720, lng: -121.4880, area_size: 10, crop_type: 'Strawberries', soil_type: 'Sandy Loam', color: '#e91e63' },
      { name: 'Root Cellar Field', description: 'Carrot and root vegetable field', lat: 38.5680, lng: -121.4960, area_size: 12, crop_type: 'Carrots', soil_type: 'Sandy', color: '#ff9800' },
      { name: 'Onion Beds', description: 'Raised bed onion cultivation', lat: 38.5660, lng: -121.5020, area_size: 8, crop_type: 'Onions', soil_type: 'Loam', color: '#cddc39' },
      { name: 'Squash Garden', description: 'Mixed squash varieties', lat: 38.5740, lng: -121.4940, area_size: 5, crop_type: 'Squash', soil_type: 'Rich Loam', color: '#ff9800' }
    ];

    for (const field of fieldLocations) {
      await pool.query(
        `INSERT INTO field_locations (user_id, name, description, latitude, longitude, area_size, crop_type, soil_type, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, field.name, field.description, field.lat, field.lng, field.area_size, field.crop_type, field.soil_type, field.color]
      );
    }
    console.log(`Seeded ${fieldLocations.length} field locations`);

    // Seed Password Reset tokens (expired historical entries)
    for (let i = 0; i < 15; i++) {
      const token = crypto.randomBytes(32).toString('hex');
      const createdAt = new Date(Date.now() - (i + 1) * 86400000 * 3);
      const expiresAt = new Date(createdAt.getTime() + 3600000);
      await pool.query(
        `INSERT INTO password_resets (user_id, token, expires_at, used, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, token, expiresAt, true, createdAt]
      );
    }
    console.log('Seeded 15 password reset records');

    console.log('\n=== Database seeding completed successfully! ===\n');
    console.log(`Demo Login Credentials:`);
    console.log(`  Email: ${process.env.DEMO_EMAIL || 'demo@agriculture.ai'}`);
    console.log(`  Password: ${process.env.DEMO_PASSWORD || 'demo123456'}`);
    console.log(`  Role: admin`);

  } catch (error) {
    console.error('Seeding error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed().catch(console.error);
