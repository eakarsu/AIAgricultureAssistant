import React, { useEffect, useState } from 'react';
import { api } from '../contexts/AuthContext';

const COMMON_CROPS = ['corn', 'wheat', 'soybean', 'rice', 'cotton', 'barley', 'potato', 'tomato', 'alfalfa'];

export default function PlantingPlanPDF() {
  const [fields, setFields] = useState([]);
  const [fieldId, setFieldId] = useState('');
  const [crop, setCrop] = useState('corn');
  const [plantingDate, setPlantingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [seedRate, setSeedRate] = useState('30,000 seeds/acre');
  const [fertilizer, setFertilizer] = useState('Pre-plant 10-10-10; side-dress N at day 55');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  useEffect(() => {
    api.get('/custom-views/fields-geo')
      .then((res) => {
        const recs = res.data.records || [];
        setFields(recs);
        if (recs.length && !fieldId) setFieldId(String(recs[0].id));
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setOkMsg('');
    setBusy(true);
    try {
      const chosen = fields.find((f) => String(f.id) === String(fieldId));
      const payload = {
        field_name: chosen?.name || 'Custom Field',
        crop_type: crop,
        planting_date: plantingDate,
        area: chosen?.area_size || null,
        area_unit: chosen?.area_unit || 'acres',
        seed_rate: seedRate,
        fertilizer_schedule: fertilizer
      };
      const res = await api.post('/custom-views/planting-plan-pdf', payload, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planting_plan_${(chosen?.name || 'field').replace(/[^a-z0-9]/gi, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setOkMsg('PDF generated and downloaded.');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to generate PDF');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Planting Plan PDF</h3>
      <form onSubmit={handleGenerate} style={{ display: 'grid', gap: 10 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          Field
          <select value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
            {fields.length === 0 && <option value="">(no fields)</option>}
            {fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} {f.crop_type ? `— ${f.crop_type}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          Crop
          <select value={crop} onChange={(e) => setCrop(e.target.value)}>
            {COMMON_CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          Planting date
          <input type="date" value={plantingDate} onChange={(e) => setPlantingDate(e.target.value)} />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          Seed rate
          <input value={seedRate} onChange={(e) => setSeedRate(e.target.value)} />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          Fertilizer schedule
          <textarea rows={3} value={fertilizer} onChange={(e) => setFertilizer(e.target.value)} />
        </label>

        <button type="submit" className="btn" disabled={busy} style={{
          padding: '10px 16px', background: '#2e7d32', color: 'white',
          border: 'none', borderRadius: 6, cursor: busy ? 'wait' : 'pointer'
        }}>
          {busy ? 'Generating...' : 'Generate PDF'}
        </button>
      </form>

      {okMsg && <div style={{ marginTop: 10, color: '#2e7d32' }}>{okMsg}</div>}
      {error && <div style={{ marginTop: 10, color: '#c62828' }}>Error: {error}</div>}
    </div>
  );
}
