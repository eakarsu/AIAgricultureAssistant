import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function FileUploadsPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchFiles = useCallback(async () => {
    try { const res = await api.get('/uploads'); setFiles(res.data.records || []); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'general');
    setUploading(true);
    try { await api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); fetchFiles(); }
    catch (err) { console.error(err); alert(err.response?.data?.error || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this file?')) {
      await api.delete(`/uploads/${id}`);
      setSelectedFile(null); fetchFiles();
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header">
        <div><h1 className="page-title">📁 File Uploads</h1><p className="page-description">Upload and manage crop photos, reports, and documents</p></div>
        <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
          {uploading ? 'Uploading...' : '+ Upload File'}
          <input type="file" hidden onChange={handleUpload} accept=".jpg,.jpeg,.png,.gif,.pdf,.csv,.xlsx" disabled={uploading} />
        </label>
      </div>
      <div className="card">
        {loading ? <div className="loading"><div className="loading-spinner"></div></div> :
        files.length === 0 ? <div className="empty-state"><div className="empty-state-icon">📁</div><h3 className="empty-state-title">No files uploaded</h3><p className="empty-state-description">Upload your first file</p></div> :
        <div className="data-table-container"><table className="data-table"><thead><tr>
          <th>File Name</th><th>Category</th><th>Size</th><th>Type</th><th>Uploaded</th>
        </tr></thead><tbody>
          {files.map(f => (
            <tr key={f.id} onClick={() => setSelectedFile(f)} tabIndex={0}>
              <td>{f.original_name}</td><td><span className="badge badge-info">{f.category}</span></td>
              <td>{formatSize(f.file_size)}</td><td>{f.mime_type?.split('/')[1] || '-'}</td>
              <td>{new Date(f.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody></table></div>}
      </div>

      {selectedFile && (
        <div className="modal-overlay" onClick={() => setSelectedFile(null)} role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">File Details</h2><button className="modal-close" onClick={() => setSelectedFile(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-item-label">File Name</div><div className="detail-item-value">{selectedFile.original_name}</div></div>
                <div className="detail-item"><div className="detail-item-label">Category</div><div className="detail-item-value">{selectedFile.category}</div></div>
                <div className="detail-item"><div className="detail-item-label">Size</div><div className="detail-item-value">{formatSize(selectedFile.file_size)}</div></div>
                <div className="detail-item"><div className="detail-item-label">Type</div><div className="detail-item-value">{selectedFile.mime_type}</div></div>
              </div>
              {selectedFile.description && <p className="mt-2">{selectedFile.description}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelectedFile(null)}>Close</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selectedFile.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
