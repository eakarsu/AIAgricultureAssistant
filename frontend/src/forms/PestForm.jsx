import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AIOutput from '../components/AIOutput';

export default function PestForm({ record, onSubmit, onCancel, apiEndpoint }) {
  const [formData, setFormData] = useState({
    affected_crop: record?.affected_crop || '', symptoms: record?.symptoms || '',
    location: record?.location || '', severity: record?.severity || 'moderate'
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

  const loadSampleData = () => setFormData({ affected_crop: 'Soybean', symptoms: 'Small round holes in leaves, chewed leaf edges, green caterpillars visible on undersides.', location: 'South Field - Row 12-18', severity: 'severe' });

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        {!record && <button type="button" className="btn btn-outline sample-data-btn" onClick={loadSampleData}>Load Sample Data</button>}
        <div className="form-row">
          <div className="form-group"><label className="form-label">Affected Crop *</label><input type="text" className="form-input" value={formData.affected_crop} onChange={(e) => setFormData({ ...formData, affected_crop: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Location</label><input type="text" className="form-input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
        </div>
        <div className="form-group"><label className="form-label">Symptoms/Signs Observed</label><textarea className="form-textarea" value={formData.symptoms} onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Severity</label><select className="form-select" value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })}><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option></select></div>
        {aiResponse && <AIOutput data={aiResponse} title="AI Pest Identification" />}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Identifying...' : (record ? 'Update' : 'Identify & Save')}</button>
      </div>
    </form>
  );
}
