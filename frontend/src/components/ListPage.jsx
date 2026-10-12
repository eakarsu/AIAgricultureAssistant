import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AIOutput from './AIOutput';
import Pagination from './Pagination';

export default function ListPage({
  title, description, apiEndpoint, columns, icon,
  emptyIcon, emptyTitle, emptyDescription, FormComponent
}) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error,setError]=useState('');
  const LIMIT = 20;
  const { api } = useAuth();
  const navigate = useNavigate();

  const fetchRecords = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);setError('');
      const res = await api.get(`${apiEndpoint}?page=${pageNum}&limit=${LIMIT}`);
      if(!Array.isArray(res.data.records)||!Number.isFinite(Number(res.data.pagination?.total)))throw Error('The native list response is malformed. Retry.');
      setRecords(res.data.records);
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotal(res.data.pagination.total || 0);
      }
    } catch (err) {
      setError(err.response?.data?.error||err.message||'Native records could not be loaded. Retry.');
    } finally {
      setLoading(false);
    }
  }, [api, apiEndpoint]);

  useEffect(() => { fetchRecords(page); }, [fetchRecords, page]);

  const handlePageChange = (newPage) => {
    setPage(newPage);

  };

  const handleRowClick = async(record)=>{setError('');try{const result=await api.get(`${apiEndpoint}/${record.id}`);if(!result.data.record||Number(result.data.record.id)!==Number(record.id))throw Error('The native detail response is malformed.');setSelectedRecord(result.data.record);setShowDetail(true);}catch(error){setError(error.response?.data?.error||error.message||'Native details could not be loaded. Retry.');}};

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await api.delete(`${apiEndpoint}/${id}`);
        fetchRecords(page);
        setShowDetail(false);
      } catch (err) { setError(err.response?.data?.error||err.message||'Native delete failed. Retry.'); }
    }
  };

  const handleEdit = (record) => { setSelectedRecord(record); setShowDetail(false); setShowForm(true); };

  const handleFormSubmit = async () => {
    await fetchRecords(page);
    setShowForm(false);
    setSelectedRecord(null);
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')} aria-label="Back to Dashboard">← Back to Dashboard</button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{icon} {title}</h1>
          <p className="page-description">{description}</p>
          {total > 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>{total} total record{total !== 1 ? 's' : ''}</p>}
        </div>
        <button className="btn btn-primary" onClick={() => { setSelectedRecord(null); setShowForm(true); }}>+ New Record</button>
      </div>

      {error&&<p role="alert" className="alert alert-error">{error}<button type="button" onClick={()=>fetchRecords(page)}>Retry</button></p>}
      <div className="card">
        {loading ? (
          <div className="loading"><div className="loading-spinner"></div><p className="loading-text">Loading records...</p></div>
        ) : records.length === 0 && page === 1 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{emptyIcon}</div>
            <h3 className="empty-state-title">{emptyTitle}</h3>
            <p className="empty-state-description">{emptyDescription}</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Create First Record</button>
          </div>
        ) : (
          <>
            <div className="data-table-container">
              <table className="data-table" role="grid">
                <thead>
                  <tr>{columns.map((col) => (<th key={col.key} scope="col">{col.label}</th>))}</tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} onClick={() => handleRowClick(record)} tabIndex={0} role="row" onKeyDown={(e) => e.key === 'Enter' && handleRowClick(record)} aria-label={`View record ${record.id}`}>
                      {columns.map((col) => (
                        <td key={col.key}>{col.render ? col.render(record[col.key], record) : record[col.key] ?? '-'}</td>
                      ))}
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
                    <div className="detail-item-value">{col.render ? col.render(selectedRecord[col.key], selectedRecord) : selectedRecord[col.key] ?? '-'}</div>
                  </div>
                ))}
              </div>
              {(selectedRecord.ai_diagnosis || selectedRecord.ai_recommendation || selectedRecord.ai_prediction || selectedRecord.ai_identification || selectedRecord.ai_analysis) && (
                <div className="mt-3"><p>Stored native analysis. Metadata edits do not regenerate it; review the original submitted inputs and provider receipt in AI Results History.</p>
                  <AIOutput data={{ analysis: selectedRecord.ai_diagnosis || selectedRecord.ai_recommendation || selectedRecord.ai_prediction || selectedRecord.ai_identification || selectedRecord.ai_analysis, timestamp: undefined }} title="AI Analysis Results" />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDetail(false)}>Cancel</button>
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
