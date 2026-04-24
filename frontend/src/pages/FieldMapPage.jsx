import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function FieldMapPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedField, setSelectedField] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', latitude: '', longitude: '', area_size: '', crop_type: '', soil_type: '', color: '#2e7d32' });

  const fetchFields = useCallback(async () => {
    try { const res = await api.get('/fields'); setFields(res.data.records || []); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { fetchFields(); }, [fetchFields]);

  const handleSave = async () => {
    try {
      if (selectedField) await api.put(`/fields/${selectedField.id}`, formData);
      else await api.post('/fields', formData);
      setShowForm(false); setSelectedField(null); fetchFields();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this field?')) {
      await api.delete(`/fields/${id}`);
      setSelectedField(null); fetchFields();
    }
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header">
        <div><h1 className="page-title">🗺️ Field Map</h1><p className="page-description">Manage your field locations and GPS coordinates</p></div>
        <button className="btn btn-primary" onClick={() => { setSelectedField(null); setFormData({ name: '', description: '', latitude: '', longitude: '', area_size: '', crop_type: '', soil_type: '', color: '#2e7d32' }); setShowForm(true); }}>+ Add Field</button>
      </div>

      <div className="card">
        {loading ? <div className="loading"><div className="loading-spinner"></div></div> :
        fields.length === 0 ? <div className="empty-state"><div className="empty-state-icon">🗺️</div><h3 className="empty-state-title">No fields added</h3><p className="empty-state-description">Add your first field location</p></div> :
        <div className="data-table-container"><table className="data-table"><thead><tr>
          <th>Name</th><th>Crop</th><th>Area</th><th>Soil</th><th>Coordinates</th>
        </tr></thead><tbody>
          {fields.map(f => (
            <tr key={f.id} onClick={() => setSelectedField(f)} tabIndex={0}>
              <td><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', backgroundColor: f.color, marginRight: 8 }}></span>{f.name}</td>
              <td>{f.crop_type || '-'}</td><td>{f.area_size} {f.area_unit}</td><td>{f.soil_type || '-'}</td>
              <td>{Number(f.latitude).toFixed(4)}, {Number(f.longitude).toFixed(4)}</td>
            </tr>
          ))}
        </tbody></table></div>}
      </div>

      {selectedField && !showForm && (
        <div className="modal-overlay" onClick={() => setSelectedField(null)} role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">{selectedField.name}</h2><button className="modal-close" onClick={() => setSelectedField(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-item-label">Crop</div><div className="detail-item-value">{selectedField.crop_type || '-'}</div></div>
                <div className="detail-item"><div className="detail-item-label">Area</div><div className="detail-item-value">{selectedField.area_size} {selectedField.area_unit}</div></div>
                <div className="detail-item"><div className="detail-item-label">Soil Type</div><div className="detail-item-value">{selectedField.soil_type || '-'}</div></div>
                <div className="detail-item"><div className="detail-item-label">Coordinates</div><div className="detail-item-value">{Number(selectedField.latitude).toFixed(6)}, {Number(selectedField.longitude).toFixed(6)}</div></div>
              </div>
              {selectedField.description && <p className="mt-2">{selectedField.description}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelectedField(null)}>Close</button>
              <button className="btn btn-outline" onClick={() => { setFormData(selectedField); setShowForm(true); }}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selectedField.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)} role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">{selectedField ? 'Edit Field' : 'New Field'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Name *</label><input type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Crop Type</label><input type="text" className="form-input" value={formData.crop_type} onChange={e => setFormData({...formData, crop_type: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Latitude *</label><input type="number" step="any" className="form-input" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Longitude *</label><input type="number" step="any" className="form-input" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Area (acres)</label><input type="number" className="form-input" value={formData.area_size} onChange={e => setFormData({...formData, area_size: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Soil Type</label><input type="text" className="form-input" value={formData.soil_type} onChange={e => setFormData({...formData, soil_type: e.target.value})} /></div>
              </div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
