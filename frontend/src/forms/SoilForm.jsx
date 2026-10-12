import useNativeAIRequest from '../components/useNativeAIRequest';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AIOutput from '../components/AIOutput';
import RecordFormDemoControls from './RecordFormDemoControls';

export default function SoilForm({ record, onSubmit, onCancel, apiEndpoint }) {
  const [formData, setFormData] = useState({
    field_name: record?.field_name ?? '', sample_location: record?.sample_location ?? '',
    ph_level: record?.ph_level ?? '', nitrogen_level: record?.nitrogen_level ?? '',
    phosphorus_level: record?.phosphorus_level ?? '', potassium_level: record?.potassium_level ?? '',
    organic_matter: record?.organic_matter ?? '', soil_texture: record?.soil_texture ?? '', moisture_content: record?.moisture_content ?? ''
  });
  const nativeAIRequest=useNativeAIRequest();const loading=nativeAIRequest.busy;const setLoading=()=>{};
  const [error, setError] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const { api } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = record ? await nativeAIRequest.run(signal=>api.put(`${apiEndpoint}/${record.id}`,formData,{signal})) : await nativeAIRequest.run(signal=>api.post(apiEndpoint,formData,{signal}));
      if (res.data.aiResponse) setAiResponse(res.data.aiResponse);
      onSubmit();
    } catch (err) { setError(err.response?.data?.error || 'The record could not be saved. Review the inputs and retry.'); } finally { setLoading(false); }
  };


  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        {error && <p role="alert" className="alert alert-error">{error}</p>}
        {!record && <RecordFormDemoControls kind="Soil" onFill={setFormData} busy={loading} />}
        <div className="form-row">
          <div className="form-group"><label className="form-label">Field Name *</label><input type="text" className="form-input" value={formData.field_name} onChange={(e) => setFormData({ ...formData, field_name: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Sample Location</label><input type="text" className="form-input" value={formData.sample_location} onChange={(e) => setFormData({ ...formData, sample_location: e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">pH Level</label><input type="number" step="0.1" className="form-input" value={formData.ph_level} onChange={(e) => setFormData({ ...formData, ph_level: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Soil Texture</label><select className="form-select" value={formData.soil_texture} onChange={(e) => setFormData({ ...formData, soil_texture: e.target.value })}><option value="">Select texture</option><option value="Sandy">Sandy</option><option value="Sandy Loam">Sandy Loam</option><option value="Loam">Loam</option><option value="Clay Loam">Clay Loam</option><option value="Clay">Clay</option><option value="Silt Loam">Silt Loam</option></select></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nitrogen (ppm)</label><input type="number" className="form-input" value={formData.nitrogen_level} onChange={(e) => setFormData({ ...formData, nitrogen_level: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Phosphorus (ppm)</label><input type="number" className="form-input" value={formData.phosphorus_level} onChange={(e) => setFormData({ ...formData, phosphorus_level: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Potassium (ppm)</label><input type="number" className="form-input" value={formData.potassium_level} onChange={(e) => setFormData({ ...formData, potassium_level: e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Organic Matter (%)</label><input type="number" step="0.1" className="form-input" value={formData.organic_matter} onChange={(e) => setFormData({ ...formData, organic_matter: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Moisture Content (%)</label><input type="number" className="form-input" value={formData.moisture_content} onChange={(e) => setFormData({ ...formData, moisture_content: e.target.value })} /></div>
        </div>
        {aiResponse && <AIOutput data={aiResponse} title="AI Soil Analysis" />}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={()=>{nativeAIRequest.cancel();onCancel();}}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Analyzing...' : (record ? 'Update' : 'Generate with OpenRouter & save')}</button>
      </div>
    </form>
  );
}
