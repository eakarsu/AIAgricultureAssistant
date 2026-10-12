import useNativeAIRequest from '../components/useNativeAIRequest';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AIOutput from '../components/AIOutput';
import RecordFormDemoControls from './RecordFormDemoControls';

export default function IrrigationForm({ record, onSubmit, onCancel, apiEndpoint }) {
  const [formData, setFormData] = useState({
    field_name: record?.field_name ?? '', crop_type: record?.crop_type ?? '', field_size: record?.field_size ?? '',
    soil_type: record?.soil_type ?? '', current_moisture: record?.current_moisture ?? '', target_moisture: record?.target_moisture ?? '',
    weather_condition: record?.weather_condition ?? '', temperature: record?.temperature ?? '', humidity: record?.humidity ?? ''
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
        {!record && <RecordFormDemoControls kind="Irrigation" onFill={setFormData} busy={loading} />}
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
        <div className="form-group"><label className="form-label">Humidity (%)</label><input type="number" className="form-input" value={formData.humidity} onChange={(e) => setFormData({ ...formData, humidity: e.target.value })} /></div>
        {aiResponse && <AIOutput data={aiResponse} title="AI Irrigation Recommendation" />}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={()=>{nativeAIRequest.cancel();onCancel();}}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Optimizing...' : (record ? 'Update' : 'Generate with OpenRouter & save')}</button>
      </div>
    </form>
  );
}
