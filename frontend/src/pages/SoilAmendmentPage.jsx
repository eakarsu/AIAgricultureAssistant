import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Page for the new POST /api/ai/soil-amendment endpoint.
 * Given soil test data + crop, returns amendment recommendations
 * (lime, gypsum, NPK, micronutrients), pH plan, cover crop suggestions, monitoring plan.
 */
export default function SoilAmendmentPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    field_id: '',
    soil_data: '',
    crop_type: '',
    target_yield: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!form.soil_data.trim()) {
      setError('Soil data is required');
      return;
    }
    setLoading(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => { if (v !== '') payload[k] = v; });
      const res = await api.post('/ai/soil-amendment', payload);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s) => {
    if (s == null) return '#64748b';
    if (s >= 70) return '#10b981';
    if (s >= 40) return '#eab308';
    return '#ef4444';
  };

  const ai = result?.result || result?.ai_result || result;

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h1 className="page-title">Soil Amendment Recommender</h1>
          <p className="page-description">AI-recommended amendments (lime, gypsum, NPK, micronutrients), pH plan, cover crops, monitoring schedule</p>
        </div>
      </div>

      <form onSubmit={submit} style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Crop Type</label>
            <input type="text" value={form.crop_type} onChange={e => setForm({ ...form, crop_type: e.target.value })} placeholder="e.g. Corn, Wheat, Tomato" />
          </div>
          <div className="form-group">
            <label>Target Yield</label>
            <input type="text" value={form.target_yield} onChange={e => setForm({ ...form, target_yield: e.target.value })} placeholder="e.g. 200 bu/ac" />
          </div>
          <div className="form-group">
            <label>Field ID (optional)</label>
            <input type="text" value={form.field_id} onChange={e => setForm({ ...form, field_id: e.target.value })} placeholder="optional field reference" />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label>Soil Test Data (paste text or JSON) *</label>
          <textarea
            rows={10}
            value={form.soil_data}
            onChange={e => setForm({ ...form, soil_data: e.target.value })}
            placeholder={'e.g. pH 5.4, OM 1.8%, P 12 ppm (Bray-1), K 95 ppm, CEC 14, Ca 1100 ppm, Mg 110, S 8, Zn 0.6, B 0.3'}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'monospace' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Analyzing...' : 'Get Amendment Recommendations'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {ai && (
        <div style={{ display: 'grid', gap: 16 }}>
          {ai.soil_health_score != null && (
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: `2px solid ${scoreColor(ai.soil_health_score)}`, textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>SOIL HEALTH SCORE</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color: scoreColor(ai.soil_health_score) }}>
                {ai.soil_health_score}/100
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {Array.isArray(ai.primary_deficiencies) && ai.primary_deficiencies.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.1)', padding: 16, borderRadius: 12, border: '1px solid #ef4444' }}>
                <h3 style={{ color: '#ef4444' }}>Primary Deficiencies</h3>
                <ul>{ai.primary_deficiencies.map((d, i) => <li key={i}>{d}</li>)}</ul>
              </div>
            )}
            {Array.isArray(ai.primary_excesses) && ai.primary_excesses.length > 0 && (
              <div style={{ background: 'rgba(234,179,8,0.1)', padding: 16, borderRadius: 12, border: '1px solid #eab308' }}>
                <h3 style={{ color: '#eab308' }}>Primary Excesses</h3>
                <ul>{ai.primary_excesses.map((d, i) => <li key={i}>{d}</li>)}</ul>
              </div>
            )}
          </div>

          {Array.isArray(ai.amendments) && ai.amendments.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Amendments</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {ai.amendments.map((a, i) => (
                  <div key={i} style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, borderLeft: '4px solid #10b981' }}>
                    <strong>{a.amendment}</strong>
                    {a.purpose && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{a.purpose}</div>}
                    {Object.entries(a)
                      .filter(([k]) => !['amendment', 'purpose'].includes(k))
                      .map(([k, v]) => (
                        <div key={k} style={{ fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{k.replace(/_/g, ' ')}: </span>
                          <span>{Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : String(v))}</span>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <details style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <summary style={{ cursor: 'pointer' }}>Full JSON response</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 12 }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
