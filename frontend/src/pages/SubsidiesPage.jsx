import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const FARM_TYPES = [
  'Crop (Row Crops)', 'Crop (Specialty)', 'Livestock', 'Dairy', 'Poultry',
  'Mixed (Crop + Livestock)', 'Organic', 'Aquaculture', 'Forestry'
];

const CATEGORY_COLORS = {
  conservation: '#10b981', crop_insurance: '#3b82f6', price_support: '#f59e0b',
  organic: '#22c55e', beginning_farmer: '#8b5cf6', other: '#64748b'
};

export default function SubsidiesPage() {
  const { api } = useAuth();
  const [form, setForm] = useState({ location: '', farm_type: FARM_TYPES[0], crops: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.location || !form.crops) { setError('Location and crops required'); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/ai/find-subsidies', {
        location: form.location,
        farm_type: form.farm_type,
        crops: form.crops.split(',').map(c => c.trim()).filter(Boolean)
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Government Subsidy & Grant Optimizer</h1>
          <p className="page-description">AI-matched USDA programs, conservation grants, and crop insurance options</p>
        </div>
      </div>

      <form onSubmit={submit} style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Location (state / county)</label>
            <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Iowa, USA" required />
          </div>
          <div className="form-group">
            <label>Farm Type</label>
            <select value={form.farm_type} onChange={e => setForm({ ...form, farm_type: e.target.value })}>
              {FARM_TYPES.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Crops Grown (comma-separated)</label>
          <input type="text" value={form.crops} onChange={e => setForm({ ...form, crops: e.target.value })}
            placeholder="e.g. Corn, Soybean, Wheat" required />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Searching...' : 'Find Programs'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div>
          <div style={{ marginBottom: 16, color: 'var(--text-muted)' }}>
            Found <strong>{result.total_programs_found}</strong> program(s) for {result.location}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
            {(result.subsidies || []).map((p, i) => (
              <div key={i} style={{
                background: 'var(--bg-card)', padding: 20, borderRadius: 12,
                border: `2px solid ${CATEGORY_COLORS[p.category] || '#64748b'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h3 style={{ margin: 0 }}>{p.program_name}</h3>
                  <span style={{
                    background: CATEGORY_COLORS[p.category] || '#64748b', color: '#fff',
                    padding: '2px 8px', borderRadius: 999, fontSize: 11, textTransform: 'capitalize'
                  }}>{p.category || 'other'}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                  {p.agency}
                </div>
                <p style={{ marginBottom: 12 }}>{p.description}</p>
                {p.max_amount && (
                  <div><strong>Max Amount:</strong> {typeof p.max_amount === 'number' ? `$${p.max_amount.toLocaleString()}` : p.max_amount}</div>
                )}
                {p.eligibility_requirements && (
                  <div style={{ marginTop: 8 }}><strong>Eligibility:</strong> {Array.isArray(p.eligibility_requirements) ? p.eligibility_requirements.join('; ') : p.eligibility_requirements}</div>
                )}
                {p.deadline && <div style={{ marginTop: 8 }}><strong>Deadline:</strong> {p.deadline}</div>}
                {p.application_url && (
                  <a href={p.application_url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-sm btn-primary" style={{ marginTop: 12, display: 'inline-block' }}>
                    Apply Online →
                  </a>
                )}
              </div>
            ))}
          </div>

          {result.disclaimer && (
            <div style={{ marginTop: 24, padding: 12, background: 'rgba(245,158,11,0.1)', borderRadius: 8, fontSize: '0.85rem' }}>
              ⚠️ {result.disclaimer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
