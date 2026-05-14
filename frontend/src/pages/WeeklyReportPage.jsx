import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function WeeklyReportPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [week, setWeek] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const generate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/ai/weekly-report', { week });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const alertColor = (level) => {
    switch (level) {
      case 'critical': return { bg: 'rgba(239,68,68,0.1)', border: '#ef4444', icon: '🚨' };
      case 'warning': return { bg: 'rgba(234,179,8,0.1)', border: '#eab308', icon: '⚠️' };
      default: return { bg: 'rgba(59,130,246,0.1)', border: '#3b82f6', icon: 'ℹ️' };
    }
  };

  const priorityColor = (p) => {
    switch (p) {
      case 'high': return '#ef4444';
      case 'medium': return '#eab308';
      default: return '#10b981';
    }
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h1 className="page-title">Weekly Farm Report</h1>
          <p className="page-description">AI-generated comprehensive summary of your farm operations and upcoming tasks</p>
        </div>
      </div>

      <form onSubmit={generate} style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label>Report Week</label>
          <input type="date" value={week} onChange={e => setWeek(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Generating Report...' : 'Generate Weekly Report'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Summary */}
          {result.summary && (
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h2>Week of {result.week}</h2>
              <p style={{ lineHeight: 1.6, marginTop: 8 }}>{result.summary}</p>
            </div>
          )}

          {/* Alerts */}
          {result.alerts?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h3>Alerts</h3>
              {result.alerts.map((alert, i) => {
                const style = alertColor(alert.level);
                return (
                  <div key={i} style={{ background: style.bg, border: `1px solid ${style.border}`, padding: '12px 16px', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span>{style.icon}</span>
                    <span>{alert.message}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Highlights */}
            {result.highlights?.length > 0 && (
              <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                <h3>Highlights</h3>
                <ul style={{ marginTop: 8 }}>
                  {result.highlights.map((h, i) => <li key={i} style={{ marginBottom: 6 }}>{h}</li>)}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations_this_week?.length > 0 && (
              <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                <h3>This Week's Recommendations</h3>
                <ul style={{ marginTop: 8 }}>
                  {result.recommendations_this_week.map((r, i) => <li key={i} style={{ marginBottom: 6 }}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Upcoming Tasks */}
          {result.upcoming_tasks?.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Upcoming Tasks</h3>
              <table style={{ width: '100%', marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Date</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {result.upcoming_tasks.map((task, i) => (
                    <tr key={i}>
                      <td>{task.task}</td>
                      <td>{task.date}</td>
                      <td>
                        <span style={{ color: priorityColor(task.priority), fontWeight: 600, textTransform: 'capitalize' }}>
                          {task.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Performance Summary */}
          {result.performance_summary && Object.keys(result.performance_summary).length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3>Performance Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 12 }}>
                {Object.entries(result.performance_summary).map(([key, value]) => (
                  <div key={key} style={{ textAlign: 'center', padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 4 }}>
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Markdown Report */}
          {result.report_markdown && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3>Full Report</h3>
                <button className="btn btn-sm btn-ghost" onClick={() => {
                  const blob = new Blob([result.report_markdown], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `farm-report-${result.week}.md`;
                  a.click();
                }}>
                  Download .md
                </button>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {result.report_markdown}
              </pre>
            </div>
          )}

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Generated at {result.timestamp ? new Date(result.timestamp).toLocaleString() : 'just now'} using {result.model || 'AI'}
          </div>
        </div>
      )}
    </div>
  );
}
