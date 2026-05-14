import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const IRRIGATION_TYPES = ['Drip', 'Sprinkler', 'Flood', 'Center Pivot', 'Furrow', 'None'];

export default function CarbonFootprintPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    farm_size: '',
    crops: '',
    irrigation_type: IRRIGATION_TYPES[0],
    water_usage: '',
    fertilizer_usage: '',
    machinery: '',
    livestock: '',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => { if (v !== '') payload[k] = v; });
      const res = await api.post('/ai/carbon-footprint', payload);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s) => {
    if (!s) return '#64748b';
    if (s >= 70) return '#10b981';
    if (s >= 40) return '#eab308';
    return '#ef4444';
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h1 className="page-title">Carbon Footprint Calculator</h1>
          <p className="page-description">Calculate your farm's CO2 emissions, sustainability score, and carbon credit opportunities</p>
        </div>
      </div>

      <form onSubmit={submit} style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Farm Size (acres)</label>
            <input type="number" min="0" step="0.1" value={form.farm_size} onChange={e => setForm({ ...form, farm_size: e.target.value })} placeholder="e.g. 250" />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Iowa, USA" />
          </div>
          <div className="form-group">
            <label>Crops Grown</label>
            <input type="text" value={form.crops} onChange={e => setForm({ ...form, crops: e.target.value })} placeholder="e.g. Corn, Soybean, Wheat" />
          </div>
          <div className="form-group">
            <label>Irrigation Type</label>
            <select value={form.irrigation_type} onChange={e => setForm({ ...form, irrigation_type: e.target.value })}>
              {IRRIGATION_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Annual Water Usage (gallons)</label>
            <input type="number" min="0" value={form.water_usage} onChange={e => setForm({ ...form, water_usage: e.target.value })} placeholder="e.g. 500000" />
          </div>
          <div className="form-group">
            <label>Fertilizer Usage (lbs/acre/year)</label>
            <input type="number" min="0" value={form.fertilizer_usage} onChange={e => setForm({ ...form, fertilizer_usage: e.target.value })} placeholder="e.g. 150" />
          </div>
          <div className="form-group">
            <label>Machinery Used</label>
            <input type="text" value={form.machinery} onChange={e => setForm({ ...form, machinery: e.target.value })} placeholder="e.g. Tractor, Combine, Sprayer" />
          </div>
          <div className="form-group">
            <label>Livestock (if any)</label>
            <input type="text" value={form.livestock} onChange={e => setForm({ ...form, livestock: e.target.value })} placeholder="e.g. 50 cattle, 200 chickens" />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Calculating...' : 'Calculate Carbon Footprint'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Top metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>TOTAL CO2e / YEAR</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#ef4444' }}>
                {result.total_co2_tons_per_year != null ? `${result.total_co2_tons_per_year.toFixed(1)}t` : '-'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>tons CO2 equivalent</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: `2px solid ${scoreColor(result.sustainability_score)}`, textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>SUSTAINABILITY SCORE</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color: scoreColor(result.sustainability_score) }}>
                {result.sustainability_score != null ? `${result.sustainability_score}/100` : '-'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>CARBON CREDITS EST.</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#10b981' }}>
                {result.carbon_credits_estimate_usd != null ? `$${result.carbon_credits_estimate_usd.toLocaleString()}` : '-'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>potential annual revenue</div>
            </div>
          </div>

          {/* Emissions Breakdown */}
          {result.breakdown && Object.keys(result.breakdown).length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Emissions Breakdown (tons CO2e)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 12 }}>
                {Object.entries(result.breakdown).map(([category, value]) => (
                  <div key={category} style={{ textAlign: 'center', padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{category}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>{typeof value === 'number' ? value.toFixed(1) : value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offset Potential */}
          {result.offset_potential_tons != null && (
            <div style={{ background: 'rgba(16,185,129,0.1)', padding: 20, borderRadius: 12, border: '1px solid #10b981' }}>
              <h3 style={{ color: '#10b981' }}>Carbon Offset Potential</h3>
              <p>Your farm can potentially offset <strong>{result.offset_potential_tons} tons CO2e</strong> per year through sustainable practices and carbon sequestration programs.</p>
            </div>
          )}

          {/* Reduction Recommendations */}
          {Array.isArray(result.reduction_recommendations) && result.reduction_recommendations.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Reduction Recommendations</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {result.reduction_recommendations.map((rec, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr', gap: 12, padding: 12, background: 'var(--bg)', borderRadius: 8, alignItems: 'center' }}>
                    <div><strong>{rec.action}</strong></div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reduction</div>
                      <div style={{ color: '#10b981', fontWeight: 600 }}>{rec.potential_reduction_tons}t</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cost</div>
                      <div>${typeof rec.cost_usd === 'number' ? rec.cost_usd.toLocaleString() : rec.cost_usd}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ROI (yr)</div>
                      <div>{rec.roi_years}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.analysis && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Full Analysis</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.analysis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
