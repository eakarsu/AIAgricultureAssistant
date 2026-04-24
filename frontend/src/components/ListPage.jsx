import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AIOutput from './AIOutput';

export default function ListPage({
  title, description, apiEndpoint, columns, icon,
  emptyIcon, emptyTitle, emptyDescription, FormComponent
}) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const { api } = useAuth();
  const navigate = useNavigate();

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(apiEndpoint);
      setRecords(res.data.records || []);
    } catch (err) {
      console.error('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  }, [api, apiEndpoint]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleRowClick = (record) => { setSelectedRecord(record); setShowDetail(true); };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await api.delete(`${apiEndpoint}/${id}`);
        fetchRecords();
        setShowDetail(false);
      } catch (err) { console.error('Failed to delete:', err); }
    }
  };

  const handleEdit = (record) => { setSelectedRecord(record); setShowDetail(false); setShowForm(true); };

  const handleFormSubmit = async () => { await fetchRecords(); setShowForm(false); setSelectedRecord(null); };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')} aria-label="Back to Dashboard">← Back to Dashboard</button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{icon} {title}</h1>
          <p className="page-description">{description}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelectedRecord(null); setShowForm(true); }}>+ New Record</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading"><div className="loading-spinner"></div><p className="loading-text">Loading records...</p></div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{emptyIcon}</div>
            <h3 className="empty-state-title">{emptyTitle}</h3>
            <p className="empty-state-description">{emptyDescription}</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Create First Record</button>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table" role="grid">
              <thead>
                <tr>{columns.map((col) => (<th key={col.key} scope="col">{col.label}</th>))}</tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} onClick={() => handleRowClick(record)} tabIndex={0} role="row" onKeyDown={(e) => e.key === 'Enter' && handleRowClick(record)} aria-label={`View record ${record.id}`}>
                    {columns.map((col) => (
                      <td key={col.key}>{col.render ? col.render(record[col.key], record) : record[col.key] || '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDetail && selectedRecord && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)} role="dialog" aria-modal="true" aria-label="Record Details">
          <div className="modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Record Details</h2>
              <button className="modal-close" onClick={() => setShowDetail(false)} aria-label="Close dialog">&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {columns.map((col) => (
                  <div key={col.key} className="detail-item">
                    <div className="detail-item-label">{col.label}</div>
                    <div className="detail-item-value">{col.render ? col.render(selectedRecord[col.key], selectedRecord) : selectedRecord[col.key] || '-'}</div>
                  </div>
                ))}
              </div>
              {(selectedRecord.ai_diagnosis || selectedRecord.ai_recommendation || selectedRecord.ai_prediction || selectedRecord.ai_identification || selectedRecord.ai_analysis) && (
                <div className="mt-3">
                  <AIOutput data={{ analysis: selectedRecord.ai_diagnosis || selectedRecord.ai_recommendation || selectedRecord.ai_prediction || selectedRecord.ai_identification || selectedRecord.ai_analysis, timestamp: selectedRecord.updated_at || selectedRecord.created_at }} title="AI Analysis Results" />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDetail(false)}>Close</button>
              <button className="btn btn-outline" onClick={() => handleEdit(selectedRecord)}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selectedRecord.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)} role="dialog" aria-modal="true" aria-label={selectedRecord ? 'Edit Record' : 'New Record'}>
          <div className="modal" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedRecord ? 'Edit Record' : 'New Record'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)} aria-label="Close dialog">&times;</button>
            </div>
            <FormComponent record={selectedRecord} onSubmit={handleFormSubmit} onCancel={() => setShowForm(false)} apiEndpoint={apiEndpoint} />
          </div>
        </div>
      )}
    </div>
  );
}
