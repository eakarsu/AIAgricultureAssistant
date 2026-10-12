import useFarmFields from '../components/useFarmFields';
import FarmFieldAvailability from '../components/FarmFieldAvailability';
import NativeAIControls from "../components/NativeAIControls";
import useNativeAIRequest from "../components/useNativeAIRequest";
import FormattedAIReport from "../components/FormattedAIReport";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Page for the new POST /api/ai/weather-risk-alert endpoint.
 * Given a forecast (text/JSON) + crop info, returns ranked weather alerts
 * (hail, frost, drought, heat, flood, wind, storm) with recommended actions.
 */
export default function WeatherRiskAlertPage() {
  const nativeAIRequest = useNativeAIRequest();

  const { api } = useAuth();
  const { fields, fieldsLoading, fieldsError, loadFields } = useFarmFields(api);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    field_id: '',
    crop_type: '',
    forecast: '',
    growth_stage: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const scenarios = [
    { name: 'Moderate weather', crop_type: 'Maize', growth_stage: 'Vegetative planning', forecast: 'Fictional planning forecast: moderate temperatures, intermittent rain and light winds. This is not a current weather feed; verify actual field observations before acting.' },
    { name: 'Storm planning', crop_type: 'Wheat', growth_stage: 'Flowering planning', forecast: 'Fictional planning forecast: gusty winds and possible thunderstorms over three days. No actual weather observation or protective action approval is supplied.' },
    { name: 'Dry period', crop_type: 'Beans', growth_stage: 'Pod development planning', forecast: 'Fictional planning forecast: a dry seven-day period with zero expected rain as an example assumption. Obtain the actual local forecast and qualified review before action.' },
  ];
  const presets = scenarios.map(scenario => ({ name: scenario.name, fill: () => {
    const preserve = (key, value) => form[key] && !scenarios.some(example => example[key] === form[key]) ? form[key] : value;
    const field = form.field_id || String(fields[0]?.id || '');
    setForm({ field_id: field, crop_type: preserve('crop_type', scenario.crop_type), growth_stage: preserve('growth_stage', scenario.growth_stage), forecast: preserve('forecast', scenario.forecast) });
    return { filled: field ? 4 : 3, manual: field ? [] : ['accessible optional farm field; no field ID will be invented'] };
  } }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!form.forecast.trim()) {
      setError('Forecast is required');
      return;
    }
    setLoading(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => { if (v !== '') payload[k] = v; });
      const res = await nativeAIRequest.run((signal) => api.post('/ai/weather-risk-alert', payload, { signal }));
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (lvl) => {
    const v = String(lvl || '').toLowerCase();
    if (v === 'severe') return '#b91c1c';
    if (v === 'high') return '#ef4444';
    if (v === 'medium') return '#eab308';
    if (v === 'low') return '#10b981';
    return '#64748b';
  };

  const ai = result?.result || result?.ai_result || result;
  const alerts = Array.isArray(ai?.alerts) ? ai.alerts : [];

  return (
    <NativeAIControls busy={nativeAIRequest.busy} onCancel={nativeAIRequest.cancel} context="Agriculture Assistant" presets={presets}><div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h1 className="page-title">Weather Risk Alerts</h1>
          <p className="page-description">AI-ranked alerts (hail, frost, drought, heat, flood, wind, storms) with recommended protective actions</p>
        </div>
      </div>

      <FarmFieldAvailability fields={fields} fieldsLoading={fieldsLoading} fieldsError={fieldsError} loadFields={loadFields} optional />
      <form onSubmit={submit} style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Crop Type</label>
            <input data-ai-field="crop_type" type="text" value={form.crop_type} onChange={e => setForm({ ...form, crop_type: e.target.value })} placeholder="e.g. Corn, Wheat, Tomato" />
          </div>
          <div className="form-group">
            <label>Growth Stage</label>
            <input data-ai-field="growth_stage" type="text" value={form.growth_stage} onChange={e => setForm({ ...form, growth_stage: e.target.value })} placeholder="e.g. V6, Tasseling, Flowering" />
          </div>
          <div className="form-group">
            <label>Field ID (optional)</label>
            <select data-ai-field="field_id" value={form.field_id} onChange={e => setForm({ ...form, field_id: e.target.value })} disabled={fieldsLoading || loading}><option value="">No field context</option>{fields.map(field => <option key={field.id} value={field.id}>{field.name}</option>)}</select>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label>Forecast (paste text or JSON) *</label>
          <textarea data-ai-field="forecast"
            rows={8}
            value={form.forecast}
            onChange={e => setForm({ ...form, forecast: e.target.value })}
            placeholder="e.g. Mon: high 92F, low 70F, 30% rain, gusty 25mph; Tue: severe T-storm risk 80%, hail possible..."
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading || Boolean(fieldsError && form.field_id)} style={{ marginTop: 12 }}>
          {loading ? 'Analyzing...' : 'Analyze Risk'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {ai && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: `2px solid ${riskColor(ai.overall_risk_level)}`, textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>OVERALL RISK LEVEL</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: riskColor(ai.overall_risk_level) }}>
              {ai.overall_risk_level || '—'}
            </div>
          </div>

          {alerts.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Alerts</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {alerts.map((a, i) => (
                  <div key={i} style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, borderLeft: `4px solid ${riskColor(a.severity)}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{a.event_type}</strong>
                      <span style={{ color: riskColor(a.severity), fontWeight: 700 }}>{a.severity}</span>
                    </div>
                    {a.expected_window && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Window: {a.expected_window}</div>}
                    {a.expected_impact && <div style={{ marginTop: 6 }}>{a.expected_impact}</div>}
                    {Array.isArray(a.recommended_actions) && a.recommended_actions.length > 0 && (
                      <ul style={{ marginTop: 8 }}>
                        {a.recommended_actions.map((r, j) => <li key={j}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <details style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <summary style={{ cursor: 'pointer' }}>Complete report</summary>
            <FormattedAIReport response={result} />
          </details>
        </div>
      )}
    </div></NativeAIControls>
  );
}
