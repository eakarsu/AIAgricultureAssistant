-- AI Agriculture Assistant Database Schema

-- Drop existing tables in dependency order for clean recreation
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS uploaded_files CASCADE;
DROP TABLE IF EXISTS weather_data CASCADE;
DROP TABLE IF EXISTS field_locations CASCADE;
DROP TABLE IF EXISTS crop_diseases CASCADE;
DROP TABLE IF EXISTS irrigation_records CASCADE;
DROP TABLE IF EXISTS harvest_predictions CASCADE;
DROP TABLE IF EXISTS pest_identifications CASCADE;
DROP TABLE IF EXISTS soil_analyses CASCADE;
DROP TABLE IF EXISTS crop_recommendations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(50),
    farm_name VARCHAR(255),
    farm_size DECIMAL(10,2),
    location VARCHAR(255),
    bio TEXT,
    role VARCHAR(20) DEFAULT 'user',
    email_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password Resets
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crop Disease Records
CREATE TABLE IF NOT EXISTS crop_diseases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    crop_name VARCHAR(255) NOT NULL,
    disease_name VARCHAR(255),
    symptoms TEXT,
    severity VARCHAR(50),
    image_url TEXT,
    ai_diagnosis TEXT,
    treatment_recommendations TEXT,
    confidence_score DECIMAL(5,2),
    location VARCHAR(255),
    detected_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Irrigation Records
CREATE TABLE IF NOT EXISTS irrigation_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    crop_type VARCHAR(255),
    field_size DECIMAL(10,2),
    field_size_unit VARCHAR(20) DEFAULT 'acres',
    soil_type VARCHAR(100),
    current_moisture DECIMAL(5,2),
    target_moisture DECIMAL(5,2),
    weather_condition VARCHAR(100),
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    ai_recommendation TEXT,
    water_needed DECIMAL(10,2),
    water_unit VARCHAR(20) DEFAULT 'gallons',
    irrigation_schedule TEXT,
    efficiency_score DECIMAL(5,2),
    last_irrigation DATE,
    next_irrigation DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Harvest Predictions
CREATE TABLE IF NOT EXISTS harvest_predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    crop_type VARCHAR(255) NOT NULL,
    planting_date DATE,
    expected_harvest_date DATE,
    field_size DECIMAL(10,2),
    field_size_unit VARCHAR(20) DEFAULT 'acres',
    current_growth_stage VARCHAR(100),
    health_status VARCHAR(100),
    weather_outlook TEXT,
    ai_prediction TEXT,
    predicted_yield DECIMAL(10,2),
    yield_unit VARCHAR(50),
    confidence_level DECIMAL(5,2),
    market_price_estimate DECIMAL(10,2),
    revenue_estimate DECIMAL(12,2),
    risk_factors TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pest Identifications
CREATE TABLE IF NOT EXISTS pest_identifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    pest_name VARCHAR(255),
    pest_type VARCHAR(100),
    affected_crop VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    severity VARCHAR(50),
    image_url TEXT,
    symptoms TEXT,
    ai_identification TEXT,
    treatment_options TEXT,
    prevention_measures TEXT,
    confidence_score DECIMAL(5,2),
    infestation_level VARCHAR(50),
    detected_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Soil Analysis Records
CREATE TABLE IF NOT EXISTS soil_analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    sample_location VARCHAR(255),
    sample_date DATE DEFAULT CURRENT_DATE,
    ph_level DECIMAL(4,2),
    nitrogen_level DECIMAL(6,2),
    phosphorus_level DECIMAL(6,2),
    potassium_level DECIMAL(6,2),
    organic_matter DECIMAL(5,2),
    soil_texture VARCHAR(100),
    moisture_content DECIMAL(5,2),
    electrical_conductivity DECIMAL(6,2),
    ai_analysis TEXT,
    health_score DECIMAL(5,2),
    recommendations TEXT,
    suitable_crops TEXT,
    fertilizer_recommendations TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    category VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    changes JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    status VARCHAR(50) DEFAULT 'open',
    admin_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Settings
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    units VARCHAR(20) DEFAULT 'imperial',
    dashboard_layout VARCHAR(20) DEFAULT 'grid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Uploaded Files
CREATE TABLE IF NOT EXISTS uploaded_files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size INTEGER,
    file_path VARCHAR(500),
    category VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weather Data
CREATE TABLE IF NOT EXISTS weather_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    location_name VARCHAR(255),
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    wind_speed DECIMAL(5,2),
    weather_condition VARCHAR(100),
    description TEXT,
    pressure DECIMAL(7,2),
    visibility DECIMAL(6,2),
    forecast_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Field Locations
CREATE TABLE IF NOT EXISTS field_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DECIMAL(10,6) NOT NULL,
    longitude DECIMAL(10,6) NOT NULL,
    area_size DECIMAL(10,2),
    area_unit VARCHAR(20) DEFAULT 'acres',
    crop_type VARCHAR(255),
    soil_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    color VARCHAR(20) DEFAULT '#2e7d32',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Results Log (persists every AI call for auditing, cost tracking, prompt improvement)
DROP TABLE IF EXISTS ai_results CASCADE;
CREATE TABLE IF NOT EXISTS ai_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    feature VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    prompt_preview TEXT,
    raw_response TEXT,
    parsed_result JSONB,
    confidence_score DECIMAL(5,2),
    tokens_used INTEGER,
    latency_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crop Rotation Recommendations
DROP TABLE IF EXISTS crop_recommendations CASCADE;
CREATE TABLE IF NOT EXISTS crop_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    field_id TEXT NOT NULL,
    recommended_crop TEXT,
    rotation_reasoning TEXT,
    soil_depletion_analysis TEXT,
    disease_pressure_analysis TEXT,
    alternative_crops JSONB,
    expected_benefits JSONB,
    ai_analysis TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subsidy Searches
DROP TABLE IF EXISTS subsidy_searches CASCADE;
CREATE TABLE IF NOT EXISTS subsidy_searches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    location VARCHAR(255),
    farm_type VARCHAR(100),
    crops TEXT,
    programs_found INTEGER,
    programs_data JSONB,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farm Chat History
DROP TABLE IF EXISTS farm_chat_history CASCADE;
CREATE TABLE IF NOT EXISTS farm_chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT,
    key_points JSONB,
    confidence DECIMAL(5,2),
    model VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Carbon Footprint Records
DROP TABLE IF EXISTS carbon_footprint_records CASCADE;
CREATE TABLE IF NOT EXISTS carbon_footprint_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    farm_size DECIMAL(10,2),
    crops TEXT,
    total_co2_tons_per_year DECIMAL(10,2),
    sustainability_score DECIMAL(5,2),
    carbon_credits_estimate_usd DECIMAL(10,2),
    breakdown JSONB,
    reduction_recommendations JSONB,
    ai_analysis TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to harvest_predictions if they don't exist
-- (handled via ALTER TABLE in migration below)

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_crop_diseases_user ON crop_diseases(user_id);
CREATE INDEX IF NOT EXISTS idx_irrigation_user ON irrigation_records(user_id);
CREATE INDEX IF NOT EXISTS idx_harvest_user ON harvest_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_pests_user ON pest_identifications(user_id);
CREATE INDEX IF NOT EXISTS idx_soil_user ON soil_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_weather_data_user ON weather_data(user_id);
CREATE INDEX IF NOT EXISTS idx_field_locations_user ON field_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_ai_results_user ON ai_results(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_results_feature ON ai_results(feature);
CREATE INDEX IF NOT EXISTS idx_crop_recommendations_user ON crop_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_subsidy_searches_user ON subsidy_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_chat_user ON farm_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_carbon_footprint_user ON carbon_footprint_records(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crop_diseases_updated_at ON crop_diseases;
CREATE TRIGGER update_crop_diseases_updated_at BEFORE UPDATE ON crop_diseases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_irrigation_updated_at ON irrigation_records;
CREATE TRIGGER update_irrigation_updated_at BEFORE UPDATE ON irrigation_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_harvest_updated_at ON harvest_predictions;
CREATE TRIGGER update_harvest_updated_at BEFORE UPDATE ON harvest_predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pests_updated_at ON pest_identifications;
CREATE TRIGGER update_pests_updated_at BEFORE UPDATE ON pest_identifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_soil_updated_at ON soil_analyses;
CREATE TRIGGER update_soil_updated_at BEFORE UPDATE ON soil_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feedback_updated_at ON feedback;
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_field_locations_updated_at ON field_locations;
CREATE TRIGGER update_field_locations_updated_at BEFORE UPDATE ON field_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
