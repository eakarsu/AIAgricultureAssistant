import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export default function PestForecastPage() {
  const { api } = useAuth();
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState({ field_id: '', pest_type: '', current_severity: 'medium' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/fields').then(res => setFields(res.data.records || res.data || [])).catch(() => {});
  }, [api]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.field_id || !form.pest_type) { setError('Field and pest type required'); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/ai/pest-forecast', form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Forecast failed');
    } finally {
      setLoading(false);
    }
  };

  const a = result?.analysis || {};
  const sevColor = (s) => {
    switch ((s || '').toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#10b981';
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pest Outbreak Forecasting</h1>
          <p className="page-description">Predict outbreak probability 2-3 weeks ahead with intervention recommendations</p>
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
            <label>Pest Type</label>
            <input type="text" value={form.pest_type} onChange={e => setForm({ ...form, pest_type: e.target.value })}
              placeholder="e.g. Aphids, Corn Borer" required />
          </div>
          <div className="form-group">
            <label>Current Severity</label>
            <select value={form.current_severity} onChange={e => setForm({ ...form, current_severity: e.target.value })}>
              {SEVERITIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Forecasting...' : 'Forecast Outbreak'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>2-WEEK PROBABILITY</div>
              <div style={{ fontSize: '2rem', color: '#f97316', fontWeight: 700 }}>{a.outbreak_probability_2_weeks ?? '?'}%</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>3-WEEK PROBABILITY</div>
              <div style={{ fontSize: '2rem', color: '#ef4444', fontWeight: 700 }}>{a.outbreak_probability_3_weeks ?? '?'}%</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: `2px solid ${sevColor(a.forecast_severity)}`, textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>FORECAST SEVERITY</div>
              <div style={{ fontSize: '1.4rem', color: sevColor(a.forecast_severity), fontWeight: 700, textTransform: 'uppercase' }}>{a.forecast_severity || '-'}</div>
            </div>
          </div>

          {a.lifecycle_stage && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Lifecycle Stage</h3>
              <p>{a.lifecycle_stage}</p>
            </div>
          )}

          {Array.isArray(a.environmental_risk_factors) && a.environmental_risk_factors.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Environmental Risk Factors</h3>
              <ul>{a.environmental_risk_factors.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
          )}

          {Array.isArray(a.recommended_interventions) && a.recommended_interventions.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Recommended Interventions</h3>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr><th>Action</th><th>Timing</th><th>Effectiveness</th></tr>
                </thead>
                <tbody>
                  {a.recommended_interventions.map((iv, i) => (
                    <tr key={i}>
                      <td>{iv.action}</td>
                      <td>{iv.timing}</td>
                      <td><span className="badge">{iv.effectiveness_rating}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {a.monitoring_schedule && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Monitoring Schedule</h3>
              <p>{a.monitoring_schedule}</p>
            </div>
          )}
          {a.economic_threshold_risk && (
            <div style={{ background: 'rgba(239,68,68,0.1)', padding: 20, borderRadius: 12, border: '1px solid #ef4444' }}>
              <h3>Economic Threshold Risk</h3>
              <p>{a.economic_threshold_risk}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
