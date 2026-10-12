import useNativeAIRequest from '../components/useNativeAIRequest';
import NativeAIControls from "../components/NativeAIControls.jsx";
import React, { useEffect, useRef, useState } from 'react';
import FormattedAIReport from '../components/FormattedAIReport';
import { simpleAIExamples, simpleAISourceKeys } from './SimpleAIExamples';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Simple, reusable AI page used by Apply pass 5 backlog endpoints.
 * Renders a configurable form that posts JSON to a given endpoint and
 * presents the genuine response as a readable report. Pages re-export this with their own config.
 */
export default function SimpleAIPage({ title, description, endpoint, fields }) {
  const { api } = useAuth();
  const navigate = useNavigate();
  const initial = Object.fromEntries(fields.map((f) => [f.name, '']));
  const [form, setForm] = useState(initial);
  const nativeAIRequest=useNativeAIRequest();const loading=nativeAIRequest.busy;const setLoading=()=>{};
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [ownedFields, setOwnedFields] = useState([]);
  const [fieldError, setFieldError] = useState('');
  const [fieldLoading, setFieldLoading] = useState(false);
  const [fieldRetry, setFieldRetry] = useState(0);
  const manualFields = useRef(new Set());
  const needsField = fields.some((field) => field.name === 'field_id');

  useEffect(() => {
    if (!needsField) return undefined;
    let live = true;
    const controller = new AbortController();
    setFieldLoading(true); setFieldError('');
    api.get('/fields', { params: { limit: 100 }, signal: controller.signal }).then((response) => {
      const records = response.data?.records;
      if (!Array.isArray(records) || records.some((record) => !record || record.id == null)) throw new Error('Field list returned an invalid response');
      if (live) setOwnedFields(records);
    }).catch((failure) => {
      if (live) { setOwnedFields([]); setFieldError(failure.response?.data?.error || failure.message || 'Could not load your fields'); }
    }).finally(() => { if (live) setFieldLoading(false); });
    return () => { live = false; controller.abort(); };
  }, [api, needsField, fieldRetry]);

  const update = (name, value) => {
    manualFields.current.add(name);
    setForm((current) => ({ ...current, [name]: value }));
  };
  const presets = ['Quick brief', 'Team planning', 'Detailed review'].map((name, index) => ({
    name,
    fill: () => {
      const example = simpleAIExamples[endpoint]?.[index];
      if (!example) return { filled: 0, manual: ['a declared native example for this tool'] };
      const selected = ownedFields.find((record) => String(record.id) === String(form.field_id));
      const chosen = selected || ownedFields[Math.min(index, Math.max(0, ownedFields.length - 1))];
      const manual = [];
      const next = { ...form };
      for (const field of fields) {
        if (field.name === 'field_id') {
          if (chosen) next.field_id = String(chosen.id);
          else { next.field_id = form.field_id || ''; manual.push('an owned field when you want to link this optional reference'); }
        } else if (chosen && simpleAISourceKeys.has(field.name) && manualFields.current.has(field.name) && String(form[field.name] ?? '').trim()) {
          next[field.name] = form[field.name];
        } else if (field.name === 'crop_type' && chosen?.crop_type) next.crop_type = chosen.crop_type;
        else if (Object.prototype.hasOwnProperty.call(example, field.name)) next[field.name] = String(example[field.name]);
        else manual.push(field.label);
      }
      setForm(next);
      return { filled: fields.filter((field) => String(next[field.name] ?? '').trim()).length, manual };
    },
  }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const required = fields.filter((f) => f.required).find((f) => !String(form[f.name] ?? '').trim());
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
      const res = await nativeAIRequest.run(signal=>api.post(endpoint,payload,{signal}));
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
<NativeAIControls busy={loading} onCancel={nativeAIRequest.cancel} context={title} presets={presets}>
        <p>Examples are fictional planning inputs, not measurements from a selected field. Entered source observations are preserved when a real field is linked. Review all data before running.</p>
        <div style={{ display: 'grid', gap: 12 }}>
          {fields.map((f) => (
            <div className="form-group" key={f.name}>
              <label>
                {f.label}
                {f.required ? ' *' : ''}
              </label>
              {f.name === 'field_id' ? (
                <>
                  <select data-ai-field="field_id" value={form.field_id || ''} onChange={(event) => update('field_id', event.target.value)} disabled={fieldLoading}>
                    <option value="">{fieldLoading ? 'Loading your fields…' : 'No linked field (optional)'}</option>
                    {ownedFields.map((record) => <option key={record.id} value={String(record.id)}>{record.name || `Field ${record.id}`}</option>)}
                  </select>
                  {fieldError && <p role="alert">{fieldError} <button type="button" onClick={() => setFieldRetry((current) => current + 1)}>Retry field list</button></p>}
                  {!fieldLoading && !fieldError && ownedFields.length === 0 && <p>No owned field is available. Examples can run without this optional link; add or select an actual field before linking a report.</p>}
                </>
              ) : f.type === 'textarea' ? (
                <textarea data-ai-field={f.name}
                  rows={f.rows || 6}
                  value={form[f.name] ?? ''}
                  onChange={(e) => update(f.name, e.target.value)}
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
                <input data-ai-field={f.name}
                  type={f.type === 'number' ? 'number' : 'text'}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={form[f.name] ?? ''}
                  onChange={(e) => update(f.name, e.target.value)}
                  placeholder={f.placeholder || ''}
                />
              )}
            </div>
          ))}
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Analyzing...' : 'Generate with OpenRouter'}
        </button>
      </NativeAIControls>
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
          <FormattedAIReport response={ai} title={title + ' · response'} />
        </div>
      )}
    </div>
  );
}
