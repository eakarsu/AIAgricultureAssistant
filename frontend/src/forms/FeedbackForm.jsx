import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function FeedbackForm({ record, onSubmit, onCancel, apiEndpoint }) {
  const [formData, setFormData] = useState({
    type: record?.type || 'general', subject: record?.subject || '',
    message: record?.message || '', rating: record?.rating || 5
  });
  const [loading, setLoading] = useState(false);
  const { api } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      record ? await api.put(`${apiEndpoint}/${record.id}`, formData) : await api.post(apiEndpoint, formData);
      onSubmit();
    } catch (err) { console.error('Failed to save:', err); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        <div className="form-row">
          <div className="form-group"><label className="form-label">Type *</label>
            <select className="form-select" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
              <option value="general">General</option><option value="bug">Bug Report</option><option value="feature">Feature Request</option><option value="improvement">Improvement</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Rating</label>
            <select className="form-select" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}>
              <option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Average</option><option value="2">2 - Poor</option><option value="1">1 - Very Poor</option>
            </select>
          </div>
        </div>
        <div className="form-group"><label className="form-label">Subject *</label><input type="text" className="form-input" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required /></div>
        <div className="form-group"><label className="form-label">Message *</label><textarea className="form-textarea" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required /></div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Submitting...' : (record ? 'Update' : 'Submit Feedback')}</button>
      </div>
    </form>
  );
}
