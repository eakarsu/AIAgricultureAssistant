import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats').catch(() => ({ data: { stats: {} } })),
      api.get('/admin/users').catch(() => ({ data: { records: [] } })),
      api.get('/admin/audit-logs').catch(() => ({ data: { records: [] } }))
    ]).then(([s, u, a]) => {
      setStats(s.data.stats); setUsers(u.data.records || []); setAuditLogs(a.data.records || []);
    }).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <div className="loading" style={{ minHeight: '50vh' }}><div className="loading-spinner"></div></div>;

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header"><div><h1 className="page-title">🛡️ Admin Panel</h1><p className="page-description">System administration and monitoring</p></div></div>

      <div className="tab-nav mb-2">
        {['stats', 'users', 'audit'].map(tab => (
          <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'stats' ? '📊 Statistics' : tab === 'users' ? '👥 Users' : '📝 Audit Logs'}
          </button>
        ))}
      </div>

      {activeTab === 'stats' && stats && (
        <div className="stats-grid">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="card"><div className="card-body text-center">
              <div className="stats-value">{value}</div>
              <div className="stats-label">{key.replace('total_', '').replace(/_/g, ' ')}</div>
            </div></div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card"><div className="data-table-container"><table className="data-table"><thead><tr>
          <th>Name</th><th>Email</th><th>Role</th><th>Verified</th><th>Joined</th>
        </tr></thead><tbody>
          {users.map(u => (
            <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td><span className="badge badge-info">{u.role}</span></td>
            <td>{u.email_verified ? '✅' : '❌'}</td><td>{new Date(u.created_at).toLocaleDateString()}</td></tr>
          ))}
        </tbody></table></div></div>
      )}

      {activeTab === 'audit' && (
        <div className="card"><div className="data-table-container"><table className="data-table"><thead><tr>
          <th>Action</th><th>Entity</th><th>User</th><th>IP</th><th>Time</th>
        </tr></thead><tbody>
          {auditLogs.map(l => (
            <tr key={l.id}><td><span className="badge badge-neutral">{l.action}</span></td><td>{l.entity_type}</td>
            <td>{l.user_name || l.user_email || '-'}</td><td>{l.ip_address}</td><td>{new Date(l.created_at).toLocaleString()}</td></tr>
          ))}
        </tbody></table></div></div>
      )}
    </div>
  );
}
