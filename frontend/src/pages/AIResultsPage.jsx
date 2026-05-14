import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';

const FEATURES = [
  '', 'crop_disease_analysis', 'crop_disease_reanalysis',
  'irrigation_optimization', 'irrigation_reoptimize',
  'harvest_prediction', 'harvest_repredict',
  'pest_identification', 'pest_reidentify',
  'soil_analysis', 'soil_reanalysis',
  'crop_rotation', 'yield_prediction', 'pest_forecast',
  'find_subsidies', 'farm_chat', 'carbon_footprint'
];

const featureLabel = (f) => f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const successBadge = (success) => (
  <span style={{
    padding: '2px 8px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
    background: success ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
    color: success ? '#10b981' : '#ef4444'
  }}>
    {success ? 'Success' : 'Failed'}
  </span>
);

export default function AIResultsPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [feature, setFeature] = useState('');
  const LIMIT = 20;

  const fetchResults = useCallback(async (pageNum = 1, feat = '') => {
    setLoading(true);
    try {
      const params = `?page=${pageNum}&limit=${LIMIT}${feat ? `&feature=${encodeURIComponent(feat)}` : ''}`;
      const res = await api.get(`/ai/results${params}`);
      setRecords(res.data.records || []);
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotal(res.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch AI results:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchResults(page, feature);
  }, [fetchResults, page, feature]);

  const handleFeatureChange = (f) => {
    setFeature(f);
    setPage(1);
    fetchResults(1, f);
  };

  const handlePageChange = (p) => {
    setPage(p);
    fetchResults(p, feature);
  };

  // Stats
  const totalTokens = records.reduce((sum, r) => sum + (r.tokens_used || 0), 0);
  const avgConfidence = records.filter(r => r.confidence_score).length > 0
    ? Math.round(records.filter(r => r.confidence_score).reduce((sum, r) => sum + r.confidence_score, 0) / records.filter(r => r.confidence_score).length)
    : null;

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Results History</h1>
          <p className="page-description">All past AI analyses, model calls, confidence scores, and token usage</p>
          {total > 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>{total} total AI calls</p>}
        </div>
      </div>

      {/* Stats Bar */}
      {records.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOTAL AI CALLS</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{total}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOKENS (THIS PAGE)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{totalTokens.toLocaleString()}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AVG CONFIDENCE</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{avgConfidence != null ? `${avgConfidence}%` : '-'}</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ marginBottom: 16 }}>
        <select value={feature} onChange={e => handleFeatureChange(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <option value="">All Features</option>
          {FEATURES.filter(f => f).map(f => (
            <option key={f} value={f}>{featureLabel(f)}</option>
          ))}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading"><div className="loading-spinner"></div><p className="loading-text">Loading AI results...</p></div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🤖</div>
            <h3 className="empty-state-title">No AI results yet</h3>
            <p className="empty-state-description">AI analysis results will appear here after you use any AI feature.</p>
          </div>
        ) : (
          <>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Model</th>
                    <th>Confidence</th>
                    <th>Tokens</th>
                    <th>Status</th>
                    <th>Entity</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td><span style={{ fontWeight: 500 }}>{featureLabel(r.feature)}</span></td>
                      <td><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.model ? r.model.split('/').pop() : '-'}</span></td>
                      <td>{r.confidence_score != null ? `${Math.round(r.confidence_score)}%` : '-'}</td>
                      <td>{r.tokens_used?.toLocaleString() || '-'}</td>
                      <td>{successBadge(r.success)}</td>
                      <td>
                        {r.entity_type && r.entity_id ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {r.entity_type.replace(/_/g, ' ')} #{r.entity_id}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
