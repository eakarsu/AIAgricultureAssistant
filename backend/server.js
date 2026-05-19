const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { generalLimiter, authLimiter, aiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { morganMiddleware } = require('./middleware/logger');
const pool = require('./config/database');

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin ${origin} not allowed`), false);
    }
  },
  credentials: true
}));

// Body parsing with size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging
app.use(morganMiddleware);

// Rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// AI-specific rate limiting on all AI-powered endpoints
app.use('/api/ai', aiLimiter);
app.use('/api/crop-diseases', aiLimiter);
app.use('/api/harvest', aiLimiter);
app.use('/api/pests', aiLimiter);
app.use('/api/soil', aiLimiter);
app.use('/api/irrigation', aiLimiter);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Import routes
const authRoutes = require('./routes/auth');
const cropDiseasesRoutes = require('./routes/cropDiseases');
const irrigationRoutes = require('./routes/irrigation');
const harvestRoutes = require('./routes/harvest');
const pestsRoutes = require('./routes/pests');
const soilRoutes = require('./routes/soil');
const settingsRoutes = require('./routes/settings');
const searchRoutes = require('./routes/search');
const exportRoutes = require('./routes/export');
const notificationsRoutes = require('./routes/notifications');
const uploadsRoutes = require('./routes/uploads');
const adminRoutes = require('./routes/admin');
const weatherRoutes = require('./routes/weather');
const fieldsRoutes = require('./routes/fields');
const feedbackRoutes = require('./routes/feedback');
const aiRoutesNew = require('./routes/aiRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/crop-diseases', cropDiseasesRoutes);
app.use('/api/irrigation', irrigationRoutes);
app.use('/api/harvest', harvestRoutes);
app.use('/api/pests', pestsRoutes);
app.use('/api/soil', soilRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/fields', fieldsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/ai', aiRoutesNew);

// Custom Views (FieldMap / CropYieldChart / PlantingPlanPDF / IrrigationScheduler)
app.use('/api/custom-views', require('./routes/customViews'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime: process.uptime(),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    },
    database: dbStatus,
    features: [
      'Crop Disease Detection',
      'Irrigation Optimization',
      'Harvest Prediction',
      'Pest Identification',
      'Soil Analysis',
      'Weather Data',
      'Field Management',
      'Notifications',
      'File Uploads',
      'Data Export',
      'Search',
      'User Settings',
      'Admin Panel',
      'Feedback System',
      'Audit Logging'
    ]
  });
});

// API Documentation info endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'AI Agriculture Assistant API',
    version: '2.0.0',
    description: 'API documentation for the AI Agriculture Assistant',
    endpoints: {
      auth: ['POST /api/auth/register', 'POST /api/auth/login', 'GET /api/auth/me', 'GET /api/auth/profile', 'PUT /api/auth/profile', 'POST /api/auth/forgot-password', 'POST /api/auth/reset-password', 'POST /api/auth/refresh-token'],
      cropDiseases: ['GET /api/crop-diseases', 'GET /api/crop-diseases/:id', 'POST /api/crop-diseases', 'PUT /api/crop-diseases/:id', 'DELETE /api/crop-diseases/:id'],
      irrigation: ['GET /api/irrigation', 'GET /api/irrigation/:id', 'POST /api/irrigation', 'PUT /api/irrigation/:id', 'DELETE /api/irrigation/:id'],
      harvest: ['GET /api/harvest', 'GET /api/harvest/:id', 'POST /api/harvest', 'PUT /api/harvest/:id', 'DELETE /api/harvest/:id'],
      pests: ['GET /api/pests', 'GET /api/pests/:id', 'POST /api/pests', 'PUT /api/pests/:id', 'DELETE /api/pests/:id'],
      soil: ['GET /api/soil', 'GET /api/soil/:id', 'POST /api/soil', 'PUT /api/soil/:id', 'DELETE /api/soil/:id'],
      settings: ['GET /api/settings', 'PUT /api/settings'],
      search: ['GET /api/search?q=term'],
      export: ['GET /api/export/:type/:format'],
      notifications: ['GET /api/notifications', 'PUT /api/notifications/:id/read', 'PUT /api/notifications/read-all', 'DELETE /api/notifications/:id'],
      uploads: ['GET /api/uploads', 'POST /api/uploads', 'DELETE /api/uploads/:id'],
      weather: ['GET /api/weather', 'GET /api/weather/forecast'],
      fields: ['GET /api/fields', 'POST /api/fields', 'PUT /api/fields/:id', 'DELETE /api/fields/:id'],
      feedback: ['GET /api/feedback', 'POST /api/feedback', 'PUT /api/feedback/:id', 'DELETE /api/feedback/:id'],
      admin: ['GET /api/admin/stats', 'GET /api/admin/users', 'GET /api/admin/audit-logs']
    }
  });
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'test') {
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           AI Agriculture Assistant Server v2.0                ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on port: ${PORT}                                 ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(45)}║
║  API Base URL: http://localhost:${PORT}/api                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Core Endpoints:                                              ║
║  - POST /api/auth/login         Login                         ║
║  - POST /api/auth/register      Register                      ║
║  - GET  /api/crop-diseases      Crop Disease Records          ║
║  - GET  /api/irrigation         Irrigation Records            ║
║  - GET  /api/harvest            Harvest Predictions           ║
║  - GET  /api/pests              Pest Identifications          ║
║  - GET  /api/soil               Soil Analyses                 ║
╠═══════════════════════════════════════════════════════════════╣
║  New Endpoints:                                               ║
║  - GET  /api/settings           User Settings                 ║
║  - GET  /api/search?q=          Global Search                 ║
║  - GET  /api/export/:type/:fmt  Data Export (CSV/JSON)        ║
║  - GET  /api/notifications      Notifications                 ║
║  - GET  /api/uploads            File Uploads                  ║
║  - GET  /api/weather            Weather Data                  ║
║  - GET  /api/fields             Field Locations               ║
║  - GET  /api/feedback           Feedback                      ║
║  - GET  /api/admin/stats        Admin Dashboard               ║
║  - GET  /api/docs               API Documentation             ║
║  - GET  /api/health             Health Check                  ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
}

module.exports = app;

// BATCH_00_AUDIT_MOUNTS
app.use('/api/imagery-analysis', require('./routes/imageryAnalysis'));
app.use('/api/irrigation-scheduler', require('./routes/irrigationScheduler'));
app.use('/api/commodity-bridge', require('./routes/commodityBridge'));
app.use('/api/iot-bridge', require('./routes/iotBridge'));
app.use('/api/sustainability-score', require('./routes/sustainabilityScore'));

// === Batch 00 Gaps & Frontend Mounts ===
app.use('/api/gap-ai-irrigation-optimization-real-time', require('./routes/gap_ai_irrigation_optimization_real_time'));
app.use('/api/gap-ai-disease-identification-leaf-plant', require('./routes/gap_ai_disease_identification_leaf_plant'));
app.use('/api/gap-ai-soil-amendment-recommendation', require('./routes/gap_ai_soil_amendment_recommendation'));
app.use('/api/gap-ai-weather-based-risk-alerts', require('./routes/gap_ai_weather_based_risk_alerts'));
app.use('/api/gap-ai-market-price-prediction-optimal', require('./routes/gap_ai_market_price_prediction_optimal'));
app.use('/api/gap-iot-sensor-ingestion-moisture-npk', require('./routes/gap_iot_sensor_ingestion_moisture_npk'));
app.use('/api/gap-drone-imagery-analysis-pipeline', require('./routes/gap_drone_imagery_analysis_pipeline'));
app.use('/api/gap-equipment-tractor-maintenance-tracking', require('./routes/gap_equipment_tractor_maintenance_tracking'));
app.use('/api/gap-limited-multi-farm-agribusiness-rollup', require('./routes/gap_limited_multi_farm_agribusiness_rollup'));
app.use('/api/gap-outbound-webhooks', require('./routes/gap_outbound_webhooks'));
