import React, { useEffect, useState } from 'react';
import { api } from '../contexts/AuthContext';

export default function IrrigationScheduler() {
  const [zone, setZone] = useState('Zone A');
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm for datetime-local
  });
  const [duration, setDuration] = useState(30);
  const [recurrence, setRecurrence] = useState('once');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [schedules, setSchedules] = useState([]);

  const loadSchedules = async () => {
    try {
      const res = await api.get('/custom-views/irrigation-schedules');
      setSchedules(res.data.records || []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => { loadSchedules(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setOkMsg('');
    setBusy(true);
    try {
      await api.post('/custom-views/irrigation-schedules', {
        zone,
        start_time: new Date(startTime).toISOString(),
        duration_minutes: parseInt(duration, 10),
        recurrence
      });
      setOkMsg('Schedule saved.');
      await loadSchedules();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save schedule');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Irrigation Scheduler</h3>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          Zone
          <input value={zone} onChange={(e) => setZone(e.target.value)} required />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          Start time
          <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          Duration (minutes)
          <input type="number" min="1" max="1440" value={duration} onChange={(e) => setDuration(e.target.value)} required />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          Recurrence
          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
            <option value="once">Once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <button type="submit" disabled={busy} style={{
          padding: '10px 16px', background: '#1e88e5', color: 'white',
          border: 'none', borderRadius: 6, cursor: busy ? 'wait' : 'pointer'
        }}>
          {busy ? 'Saving...' : 'Schedule'}
        </button>
      </form>

      {okMsg && <div style={{ marginTop: 10, color: '#2e7d32' }}>{okMsg}</div>}
      {error && <div style={{ marginTop: 10, color: '#c62828' }}>Error: {error}</div>}

      <h4 style={{ marginTop: 20 }}>Upcoming / Recent Schedules</h4>
      {schedules.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)' }}>No schedules yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', padding: 6 }}>Zone</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', padding: 6 }}>Start</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', padding: 6 }}>Duration (min)</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', padding: 6 }}>Recurrence</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id}>
                <td style={{ padding: 6, borderBottom: '1px solid var(--border-color)' }}>{s.zone}</td>
                <td style={{ padding: 6, borderBottom: '1px solid var(--border-color)' }}>{new Date(s.start_time).toLocaleString()}</td>
                <td style={{ padding: 6, borderBottom: '1px solid var(--border-color)' }}>{s.duration_minutes}</td>
                <td style={{ padding: 6, borderBottom: '1px solid var(--border-color)' }}>{s.recurrence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
