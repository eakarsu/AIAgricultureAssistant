import useNativeAIRequest from '../components/useNativeAIRequest';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AIOutput from '../components/AIOutput';
import RecordFormDemoControls from './RecordFormDemoControls';

export default function PestForm({ record, onSubmit, onCancel, apiEndpoint }) {
  const [formData, setFormData] = useState({
    affected_crop: record?.affected_crop ?? '', symptoms: record?.symptoms ?? '',
    location: record?.location ?? '', severity: record?.severity || 'moderate'
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
        {!record && <RecordFormDemoControls kind="Pest" onFill={setFormData} busy={loading} />}
        <div className="form-row">
          <div className="form-group"><label className="form-label">Affected Crop *</label><input type="text" className="form-input" value={formData.affected_crop} onChange={(e) => setFormData({ ...formData, affected_crop: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Location</label><input type="text" className="form-input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
        </div>
        <div className="form-group"><label className="form-label">Symptoms/Signs Observed</label><textarea className="form-textarea" value={formData.symptoms} onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Severity</label><select className="form-select" value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })}><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option></select></div>
        {aiResponse && <AIOutput data={aiResponse} title="AI Pest Identification" />}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={()=>{nativeAIRequest.cancel();onCancel();}}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Identifying...' : (record ? 'Update' : 'Generate with OpenRouter & save')}</button>
      </div>
    </form>
  );
}
