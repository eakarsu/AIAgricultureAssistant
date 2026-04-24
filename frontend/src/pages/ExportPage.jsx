import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ExportPage() {
  const navigate = useNavigate();

  const exportTypes = [
    { key: 'crop-diseases', icon: '🔬', label: 'Crop Diseases', description: 'Export all crop disease detection records' },
    { key: 'irrigation', icon: '💧', label: 'Irrigation Records', description: 'Export irrigation optimization data' },
    { key: 'harvest', icon: '📊', label: 'Harvest Predictions', description: 'Export harvest yield predictions' },
    { key: 'pests', icon: '🐛', label: 'Pest Identifications', description: 'Export pest identification records' },
    { key: 'soil', icon: '🌱', label: 'Soil Analyses', description: 'Export soil health analysis data' }
  ];

  const handleExport = (type, format) => {
    const token = localStorage.getItem('token');
    window.open(`/api/export/${type}/${format}?token=${token}`, '_blank');
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header"><div><h1 className="page-title">📥 Data Export</h1><p className="page-description">Export your farm data in CSV or JSON format</p></div></div>
      <div className="export-grid">
        {exportTypes.map(type => (
          <div key={type.key} className="card">
            <div className="card-body">
              <h3>{type.icon} {type.label}</h3>
              <p style={{ color: 'var(--text-secondary)', margin: '8px 0 16px' }}>{type.description}</p>
              <div className="flex gap-1">
                <button className="btn btn-primary btn-sm" onClick={() => handleExport(type.key, 'csv')}>📄 Export CSV</button>
                <button className="btn btn-outline btn-sm" onClick={() => handleExport(type.key, 'json')}>📋 Export JSON</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
