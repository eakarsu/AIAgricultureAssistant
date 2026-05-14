import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SEASONS = ['Spring 2026', 'Summer 2026', 'Fall 2026', 'Winter 2026'];

export default function YieldPredictionPage() {
  const { api } = useAuth();
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState({ field_id: '', crop_type: '', season: SEASONS[0] });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/fields').then(res => setFields(res.data.records || res.data || [])).catch(() => {});
  }, [api]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.field_id || !form.crop_type) { setError('Field and crop type required'); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/ai/yield-prediction', form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const a = result?.analysis || {};

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Yield Prediction Model</h1>
          <p className="page-description">Forecast next harvest yield with confidence ranges and revenue estimates</p>
        </div>
      </div>

      <form onSubmit={submit} style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div className="form-group">
            <label>Field</label>
            <select value={form.field_id} onChange={e => setForm({ ...form, field_id: e.target.value })} required>
              <option value="">-- Select --</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Crop Type</label>
            <input type="text" value={form.crop_type} onChange={e => setForm({ ...form, crop_type: e.target.value })}
              placeholder="e.g. Corn, Soybean" required />
          </div>
          <div className="form-group">
            <label>Season</label>
            <select value={form.season} onChange={e => setForm({ ...form, season: e.target.value })}>
              {SEASONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Predicting...' : 'Predict Yield'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {(a.predicted_yield_low != null || a.predicted_yield_high != null) && (
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h2>Predicted Yield</h2>
              <div style={{ fontSize: '2.5rem', color: '#10b981', fontWeight: 700 }}>
                {a.predicted_yield_low ?? '?'} – {a.predicted_yield_high ?? '?'} {a.predicted_yield_unit || ''}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <div><strong>Confidence:</strong> {a.confidence_percentage ?? '?'}%</div>
                <div><strong>Harvest est.:</strong> {a.harvest_date_estimate || '-'}</div>
              </div>
              {(a.revenue_estimate_low != null || a.revenue_estimate_high != null) && (
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(16,185,129,0.1)', borderRadius: 8 }}>
                  <strong>Revenue Estimate:</strong> ${a.revenue_estimate_low?.toLocaleString() ?? '?'} – ${a.revenue_estimate_high?.toLocaleString() ?? '?'}
                </div>
              )}
            </div>
          )}

          {Array.isArray(a.key_factors) && a.key_factors.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Key Factors</h3>
              <ul>{a.key_factors.map((k, i) => <li key={i}>{k}</li>)}</ul>
            </div>
          )}
          {Array.isArray(a.risk_factors) && a.risk_factors.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid #ef4444' }}>
              <h3>⚠️ Risk Factors</h3>
              <ul>{a.risk_factors.map((k, i) => <li key={i}>{k}</li>)}</ul>
            </div>
          )}
          {Array.isArray(a.recommendations) && a.recommendations.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Recommendations</h3>
              <ul>{a.recommendations.map((k, i) => <li key={i}>{k}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
