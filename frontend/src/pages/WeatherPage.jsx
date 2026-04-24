import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function WeatherPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [weatherData, setWeatherData] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/weather'),
      api.get('/weather/forecast?lat=38.58&lon=-121.49')
    ]).then(([weather, fc]) => {
      setWeatherData(weather.data.records || []);
      setForecast(fc.data.forecast);
    }).catch(console.error).finally(() => setLoading(false));
  }, [api]);

  const conditionIcons = { 'Sunny': '☀️', 'Partly Cloudy': '⛅', 'Cloudy': '☁️', 'Rainy': '🌧️', 'Foggy': '🌫️', 'Hot': '🌡️', 'Hot & Dry': '🌡️', 'Windy': '💨', 'Warm': '🌤️', 'Pleasant': '🌤️', 'Mild': '🌤️', 'Clear': '☀️', 'Dry': '☀️', 'Warm & Humid': '🌤️', 'Controlled': '🏠', 'Thunderstorm': '⛈️' };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header"><div><h1 className="page-title">🌤️ Weather Data</h1><p className="page-description">Current weather conditions and forecasts for your farm locations</p></div></div>

      {loading ? <div className="loading"><div className="loading-spinner"></div></div> : <>
        {forecast && <div className="card mb-2"><div className="card-body">
          <h3 className="mb-2">7-Day Forecast</h3>
          <div className="forecast-grid">
            {forecast.daily?.map((day, i) => (
              <div key={i} className="forecast-item">
                <div className="forecast-date">{new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}</div>
                <div className="forecast-icon" aria-hidden="true">{conditionIcons[day.condition] || '🌤️'}</div>
                <div className="forecast-temps"><span className="temp-high">{day.high}°</span> <span className="temp-low">{day.low}°</span></div>
                <div className="forecast-condition">{day.condition}</div>
              </div>
            ))}
          </div>
        </div></div>}

        <div className="card">
          <div className="card-header"><h3>Location Weather</h3></div>
          {weatherData.length === 0 ? <div className="empty-state"><div className="empty-state-icon">🌤️</div><h3 className="empty-state-title">No weather data</h3></div> :
          <div className="data-table-container"><table className="data-table"><thead><tr>
            <th>Location</th><th>Temp</th><th>Humidity</th><th>Wind</th><th>Condition</th>
          </tr></thead><tbody>
            {weatherData.map(w => (
              <tr key={w.id} onClick={() => setSelectedRecord(w)} tabIndex={0}>
                <td>{w.location_name}</td><td>{w.temperature}°F</td><td>{w.humidity}%</td><td>{w.wind_speed} mph</td>
                <td>{conditionIcons[w.weather_condition] || ''} {w.weather_condition}</td>
              </tr>
            ))}
          </tbody></table></div>}
        </div>

        {selectedRecord && (
          <div className="modal-overlay" onClick={() => setSelectedRecord(null)} role="dialog" aria-modal="true">
            <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">{selectedRecord.location_name} Weather</h2><button className="modal-close" onClick={() => setSelectedRecord(null)}>&times;</button></div>
              <div className="modal-body">
                <div className="detail-grid">
                  <div className="detail-item"><div className="detail-item-label">Temperature</div><div className="detail-item-value">{selectedRecord.temperature}°F</div></div>
                  <div className="detail-item"><div className="detail-item-label">Humidity</div><div className="detail-item-value">{selectedRecord.humidity}%</div></div>
                  <div className="detail-item"><div className="detail-item-label">Wind Speed</div><div className="detail-item-value">{selectedRecord.wind_speed} mph</div></div>
                  <div className="detail-item"><div className="detail-item-label">Condition</div><div className="detail-item-value">{selectedRecord.weather_condition}</div></div>
                  <div className="detail-item"><div className="detail-item-label">Coordinates</div><div className="detail-item-value">{selectedRecord.latitude}, {selectedRecord.longitude}</div></div>
                </div>
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>{selectedRecord.description}</p>
              </div>
              <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setSelectedRecord(null)}>Close</button></div>
            </div>
          </div>
        )}
      </>}
    </div>
  );
}
