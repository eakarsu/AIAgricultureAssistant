import useNativeAIRequest from '../components/useNativeAIRequest';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AIOutput from '../components/AIOutput';
import RecordFormDemoControls from './RecordFormDemoControls';

export default function CropDiseaseForm({ record, onSubmit, onCancel, apiEndpoint }) {
  const [formData, setFormData] = useState({
    crop_name: record?.crop_name ?? '', symptoms: record?.symptoms ?? '',
    severity: record?.severity || 'unknown', location: record?.location ?? '',
    detected_date: record?.detected_date?.split('T')[0] || new Date().toISOString().split('T')[0]
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
        {!record && <RecordFormDemoControls kind="CropDisease" onFill={setFormData} busy={loading} />}
        <div className="form-row">
          <div className="form-group"><label className="form-label">Crop Name *</label><input type="text" className="form-input" value={formData.crop_name} onChange={(e) => setFormData({ ...formData, crop_name: e.target.value })} placeholder="e.g., Tomato, Wheat, Corn" required /></div>
          <div className="form-group"><label className="form-label">Severity</label><select className="form-select" value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })}><option value="unknown">Unknown</option><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option></select></div>
        </div>
        <div className="form-group"><label className="form-label">Symptoms</label><textarea className="form-textarea" value={formData.symptoms} onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })} placeholder="Describe the symptoms you've observed" /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Location</label><input type="text" className="form-input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., Field A, North Section" /></div>
          <div className="form-group"><label className="form-label">Detection Date</label><input type="date" className="form-input" value={formData.detected_date} onChange={(e) => setFormData({ ...formData, detected_date: e.target.value })} /></div>
        </div>
        {aiResponse && <AIOutput data={aiResponse} title="AI Disease Analysis" />}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={()=>{nativeAIRequest.cancel();onCancel();}}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Analyzing...' : (record ? 'Update' : 'Generate with OpenRouter & save')}</button>
      </div>
    </form>
  );
}
