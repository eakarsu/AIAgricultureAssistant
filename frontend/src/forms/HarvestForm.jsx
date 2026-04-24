import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AIOutput from '../components/AIOutput';

export default function HarvestForm({ record, onSubmit, onCancel, apiEndpoint }) {
  const [formData, setFormData] = useState({
    field_name: record?.field_name || '', crop_type: record?.crop_type || '', field_size: record?.field_size || '',
    planting_date: record?.planting_date?.split('T')[0] || '', current_growth_stage: record?.current_growth_stage || '',
    health_status: record?.health_status || '', weather_outlook: record?.weather_outlook || ''
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

  const loadSampleData = () => setFormData({ field_name: 'East Valley Field', crop_type: 'Wheat', field_size: '120', planting_date: '2025-09-15', current_growth_stage: 'Flowering', health_status: 'Good', weather_outlook: 'Warm and dry for the next 2 weeks, temperatures around 80-85F.' });

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        {!record && <button type="button" className="btn btn-outline sample-data-btn" onClick={loadSampleData}>Load Sample Data</button>}
        <div className="form-row">
          <div className="form-group"><label className="form-label">Field Name *</label><input type="text" className="form-input" value={formData.field_name} onChange={(e) => setFormData({ ...formData, field_name: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Crop Type *</label><input type="text" className="form-input" value={formData.crop_type} onChange={(e) => setFormData({ ...formData, crop_type: e.target.value })} required /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Field Size (acres)</label><input type="number" className="form-input" value={formData.field_size} onChange={(e) => setFormData({ ...formData, field_size: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Planting Date</label><input type="date" className="form-input" value={formData.planting_date} onChange={(e) => setFormData({ ...formData, planting_date: e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Growth Stage</label><input type="text" className="form-input" value={formData.current_growth_stage} onChange={(e) => setFormData({ ...formData, current_growth_stage: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Health Status</label><select className="form-select" value={formData.health_status} onChange={(e) => setFormData({ ...formData, health_status: e.target.value })}><option value="">Select status</option><option value="Excellent">Excellent</option><option value="Good">Good</option><option value="Fair">Fair</option><option value="Poor">Poor</option></select></div>
        </div>
        <div className="form-group"><label className="form-label">Weather Outlook</label><textarea className="form-textarea" value={formData.weather_outlook} onChange={(e) => setFormData({ ...formData, weather_outlook: e.target.value })} /></div>
        {aiResponse && <AIOutput data={aiResponse} title="AI Harvest Prediction" />}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Predicting...' : (record ? 'Update' : 'Predict & Save')}</button>
      </div>
    </form>
  );
}
