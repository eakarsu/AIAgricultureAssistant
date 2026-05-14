import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Simple, reusable AI page used by Apply pass 5 backlog endpoints.
 * Renders a configurable form that posts JSON to a given endpoint and
 * dumps the structured response. Pages re-export this with their own config.
 */
export default function SimpleAIPage({ title, description, endpoint, fields }) {
  const { api } = useAuth();
  const navigate = useNavigate();
  const initial = Object.fromEntries(fields.map((f) => [f.name, '']));
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const required = fields.filter((f) => f.required).find((f) => !String(form[f.name] || '').trim());
    if (required) {
      setError(`${required.label} is required`);
      return;
    }
    setLoading(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v === '' || v == null) return;
        const f = fields.find((x) => x.name === k);
        if (f && f.type === 'number') payload[k] = Number(v);
        else payload[k] = v;
      });
      const res = await api.post(endpoint, payload);
      setResult(res.data);
    } catch (err) {
      const status = err.response?.status;
      const body = err.response?.data || {};
      if (status === 503) {
        setError(`AI unavailable${body.missing ? ` (missing ${body.missing})` : ''}`);
      } else {
        setError(body.error || err.message || 'Request failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const ai = result?.analysis || result?.result || result;

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-description">{description}</p>}
        </div>
      </div>
      <form
        onSubmit={submit}
        style={{
          background: 'var(--bg-card)',
          padding: 24,
          borderRadius: 12,
          border: '1px solid var(--border)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          {fields.map((f) => (
            <div className="form-group" key={f.name}>
              <label>
                {f.label}
                {f.required ? ' *' : ''}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  rows={f.rows || 6}
                  value={form[f.name]}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  placeholder={f.placeholder || ''}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontFamily: 'monospace',
                  }}
                />
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
                  value={form[f.name]}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  placeholder={f.placeholder || ''}
                />
              )}
            </div>
          ))}
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Analyzing...' : 'Run AI Analysis'}
        </button>
      </form>
      {error && <div className="alert alert-error">{error}</div>}
      {ai && (
        <div
          style={{
            background: 'var(--bg-card)',
            padding: 16,
            borderRadius: 12,
            border: '1px solid var(--border)',
          }}
        >
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(ai, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
