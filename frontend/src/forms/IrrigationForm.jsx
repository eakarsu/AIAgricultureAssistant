import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AIOutput from '../components/AIOutput';

export default function IrrigationForm({ record, onSubmit, onCancel, apiEndpoint }) {
  const [formData, setFormData] = useState({
    field_name: record?.field_name || '', crop_type: record?.crop_type || '', field_size: record?.field_size || '',
    soil_type: record?.soil_type || '', current_moisture: record?.current_moisture || '', target_moisture: record?.target_moisture || '',
    weather_condition: record?.weather_condition || '', temperature: record?.temperature || '', humidity: record?.humidity || ''
  });
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const { api } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = record ? await api.put(`${apiEndpoint}/${record.id}`, formData) : await api.post(apiEndpoint, formData);
      if (res.data.aiResponse) setAiResponse(res.data.aiResponse);
      onSubmit();
    } catch (err) { console.error('Failed to save:', err); } finally { setLoading(false); }
  };

  const loadSampleData = () => setFormData({ field_name: 'North Field', crop_type: 'Corn', field_size: '45', soil_type: 'Clay Loam', current_moisture: '28', target_moisture: '65', weather_condition: 'Sunny', temperature: '88', humidity: '42' });

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        {!record && <button type="button" className="btn btn-outline sample-data-btn" onClick={loadSampleData}>Load Sample Data</button>}
        <div className="form-row">
          <div className="form-group"><label className="form-label">Field Name *</label><input type="text" className="form-input" value={formData.field_name} onChange={(e) => setFormData({ ...formData, field_name: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Crop Type</label><input type="text" className="form-input" value={formData.crop_type} onChange={(e) => setFormData({ ...formData, crop_type: e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Field Size (acres)</label><input type="number" className="form-input" value={formData.field_size} onChange={(e) => setFormData({ ...formData, field_size: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Soil Type</label><input type="text" className="form-input" value={formData.soil_type} onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Current Moisture (%)</label><input type="number" className="form-input" value={formData.current_moisture} onChange={(e) => setFormData({ ...formData, current_moisture: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Target Moisture (%)</label><input type="number" className="form-input" value={formData.target_moisture} onChange={(e) => setFormData({ ...formData, target_moisture: e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Weather Condition</label><select className="form-select" value={formData.weather_condition} onChange={(e) => setFormData({ ...formData, weather_condition: e.target.value })}><option value="">Select weather</option><option value="Sunny">Sunny</option><option value="Partly Cloudy">Partly Cloudy</option><option value="Cloudy">Cloudy</option><option value="Rainy">Rainy</option></select></div>
          <div className="form-group"><label className="form-label">Temperature (F)</label><input type="number" className="form-input" value={formData.temperature} onChange={(e) => setFormData({ ...formData, temperature: e.target.value })} /></div>
        </div>
        {aiResponse && <AIOutput data={aiResponse} title="AI Irrigation Recommendation" />}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Optimizing...' : (record ? 'Update' : 'Optimize & Save')}</button>
      </div>
    </form>
  );
}
