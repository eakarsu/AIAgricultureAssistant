const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { query, validationResult } = require('express-validator');

const router = express.Router();

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  return null;
}

// Get stored weather data for user
router.get('/', authMiddleware, async (req, res) => {
  try {
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

// Get weather forecast for a location
// Tries real OpenWeatherMap API first; falls back to seeded mock data
router.get('/forecast',
  authMiddleware,
  [
    query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('lat must be between -90 and 90'),
    query('lon').optional().isFloat({ min: -180, max: 180 }).withMessage('lon must be between -180 and 180')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const lat = parseFloat(req.query.lat) || 38.9;
      const lon = parseFloat(req.query.lon) || -77.0;

      // Try real weather API if key is configured
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (apiKey) {
        try {
          const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial&cnt=40`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const response = await fetch(weatherUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            // Group by day and pick noon entry
            const dailyMap = {};
            for (const item of (data.list || [])) {
              const day = item.dt_txt.split(' ')[0];
              if (!dailyMap[day]) dailyMap[day] = item;
            }
            const daily = Object.entries(dailyMap).slice(0, 7).map(([date, item]) => ({
              date,
              high: Math.round(item.main.temp_max),
              low: Math.round(item.main.temp_min),
              condition: item.weather[0]?.main || 'Clear',
              precipitation: Math.round((item.pop || 0) * 100),
              humidity: item.main.humidity
            }));

            const current = data.list[0];
            return res.json({
              forecast: {
                location: { lat, lon, name: data.city?.name || 'Your Location' },
                current: {
                  temperature: Math.round(current.main.temp),
                  humidity: current.main.humidity,
                  wind_speed: Math.round(current.wind?.speed || 0),
                  condition: current.weather[0]?.main || 'Clear',
                  description: current.weather[0]?.description || ''
                },
                daily,
                source: 'openweathermap'
              }
            });
          }
        } catch (weatherErr) {
          console.warn('OpenWeatherMap API failed, using mock data:', weatherErr.message);
        }
      }

      // Fallback to deterministic mock data (same day = same values)
      const seed = Math.floor(Date.now() / 86400000); // changes daily
      const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Thunderstorm'];
      const forecast = {
        location: { lat, lon },
        current: {
          temperature: 70 + (seed % 25),
          humidity: 45 + (seed % 35),
          wind_speed: 5 + (seed % 15),
          condition: conditions[seed % conditions.length],
          description: 'Forecast data (demo mode — set OPENWEATHER_API_KEY for live data)'
        },
        daily: Array.from({ length: 7 }, (_, i) => {
          const daySeed = seed + i;
          return {
            date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
            high: 70 + (daySeed % 20),
            low: 50 + (daySeed % 15),
            condition: conditions[daySeed % conditions.length],
            precipitation: (daySeed % 5) * 15,
            humidity: 45 + (daySeed % 35)
          };
        }),
        source: 'mock'
      };

      res.json({ forecast });
    } catch (error) {
      console.error('Error fetching forecast:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
