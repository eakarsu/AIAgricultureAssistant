import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsPage() {
  const { api } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ theme: 'light', language: 'en', notifications_enabled: true, email_notifications: true, units: 'imperial', dashboard_layout: 'grid' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/settings').then(res => {
      setSettings(res.data.settings);
      if (res.data.settings.theme) setTheme(res.data.settings.theme);
    }).catch(console.error).finally(() => setLoading(false));
  }, [api, setTheme]);

  const handleSave = async () => {
    try {
      await api.put('/settings', settings);
      setTheme(settings.theme);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="loading"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header">
        <div><h1 className="page-title">⚙️ Settings</h1><p className="page-description">Configure your application preferences</p></div>
        <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
      </div>
      {message && <div className="alert alert-success">{message}</div>}
      <div className="settings-grid">
        <div className="card"><div className="card-body">
          <h3 className="mb-2">Appearance</h3>
          <div className="form-group"><label className="form-label">Theme</label>
            <select className="form-select" value={settings.theme} onChange={(e) => setSettings({...settings, theme: e.target.value})}><option value="light">Light</option><option value="dark">Dark</option></select>
          </div>
          <div className="form-group"><label className="form-label">Dashboard Layout</label>
            <select className="form-select" value={settings.dashboard_layout} onChange={(e) => setSettings({...settings, dashboard_layout: e.target.value})}><option value="grid">Grid</option><option value="list">List</option></select>
          </div>
        </div></div>
        <div className="card"><div className="card-body">
          <h3 className="mb-2">Language & Units</h3>
          <div className="form-group"><label className="form-label">Language</label>
            <select className="form-select" value={settings.language} onChange={(e) => setSettings({...settings, language: e.target.value})}><option value="en">English</option><option value="tr">Turkish</option></select>
          </div>
          <div className="form-group"><label className="form-label">Units</label>
            <select className="form-select" value={settings.units} onChange={(e) => setSettings({...settings, units: e.target.value})}><option value="imperial">Imperial (F, acres, gallons)</option><option value="metric">Metric (C, hectares, liters)</option></select>
          </div>
        </div></div>
        <div className="card"><div className="card-body">
          <h3 className="mb-2">Notifications</h3>
          <div className="form-group"><label className="form-label toggle-label"><input type="checkbox" checked={settings.notifications_enabled} onChange={(e) => setSettings({...settings, notifications_enabled: e.target.checked})} /> Enable Push Notifications</label></div>
          <div className="form-group"><label className="form-label toggle-label"><input type="checkbox" checked={settings.email_notifications} onChange={(e) => setSettings({...settings, email_notifications: e.target.checked})} /> Enable Email Notifications</label></div>
        </div></div>
      </div>
    </div>
  );
}
