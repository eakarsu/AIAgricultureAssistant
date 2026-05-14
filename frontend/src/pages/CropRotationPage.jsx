import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function CropRotationPage() {
  const { api } = useAuth();
  const [fields, setFields] = useState([]);
  const [fieldId, setFieldId] = useState('');
  const [historyYears, setHistoryYears] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/fields')
      .then(res => setFields(res.data.records || res.data || []))
      .catch(() => {});
  }, [api]);

  const submit = async (e) => {
    e.preventDefault();
    if (!fieldId) { setError('Please select a field'); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/ai/crop-rotation', { field_id: fieldId, history_years: Number(historyYears) });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Recommendation failed');
    } finally {
      setLoading(false);
    }
  };

  const a = result?.analysis || {};

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Crop Rotation Advisor</h1>
          <p className="page-description">AI-powered next-season crop recommendations based on soil and disease pressure</p>
        </div>
      </div>

      <form onSubmit={submit} className="form-card" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Field</label>
            <select value={fieldId} onChange={e => setFieldId(e.target.value)} required>
              <option value="">-- Select a field --</option>
              {fields.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.crop_type ? `(${f.crop_type})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>History (years)</label>
            <input type="number" min="1" max="20" value={historyYears} onChange={e => setHistoryYears(e.target.value)} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Analyzing...' : 'Get Recommendation'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {a.recommended_crop && (
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '2px solid #10b981' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>RECOMMENDED CROP</div>
              <h2 style={{ color: '#10b981', fontSize: '2rem', margin: '8px 0' }}>{a.recommended_crop}</h2>
              <p>{a.rotation_reasoning}</p>
            </div>
          )}

          {(a.soil_depletion_analysis || a.disease_pressure_analysis) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {a.soil_depletion_analysis && (
                <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <h3>🌱 Soil Depletion</h3>
                  <p>{a.soil_depletion_analysis}</p>
                </div>
              )}
              {a.disease_pressure_analysis && (
                <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <h3>🦠 Disease Pressure</h3>
                  <p>{a.disease_pressure_analysis}</p>
                </div>
              )}
            </div>
          )}

          {Array.isArray(a.alternative_crops) && a.alternative_crops.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Alternative Crops</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {a.alternative_crops.map((c, i) => <span key={i} className="badge" style={{ padding: '6px 12px' }}>{c}</span>)}
              </div>
            </div>
          )}

          {Array.isArray(a.expected_benefits) && a.expected_benefits.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Expected Benefits</h3>
              <ul>{a.expected_benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          )}

          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Analyzed {result.crop_history_records || 0} historical record(s) for field #{result.field_id}.
          </div>
        </div>
      )}
    </div>
  );
}
