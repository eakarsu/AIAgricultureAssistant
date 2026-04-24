const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get weather data
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { lat, lon, location_name } = req.query;

    // Return stored weather data for user
    const result = await pool.query(
      `SELECT * FROM weather_data WHERE user_id = $1
       ORDER BY forecast_date DESC, created_at DESC LIMIT 20`,
      [req.user.id]
    );

    res.json({ records: result.rows });
  } catch (error) {
    console.error('Error fetching weather:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get weather for specific location (mock)
router.get('/forecast', authMiddleware, async (req, res) => {
  try {
    const { lat, lon } = req.query;

    // Mock weather data response
    const forecast = {
      location: { lat: parseFloat(lat) || 38.9, lon: parseFloat(lon) || -77.0 },
      current: {
        temperature: Math.round(65 + Math.random() * 30),
        humidity: Math.round(40 + Math.random() * 40),
        wind_speed: Math.round(5 + Math.random() * 15),
        condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
        description: 'Current weather conditions for your area'
      },
      daily: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
        high: Math.round(70 + Math.random() * 25),
        low: Math.round(50 + Math.random() * 15),
        condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Thunderstorm'][Math.floor(Math.random() * 5)],
        precipitation: Math.round(Math.random() * 80),
        humidity: Math.round(40 + Math.random() * 40)
      }))
    };

    res.json({ forecast });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
