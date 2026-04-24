import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SearchResultsPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query) {
      setLoading(true);
      api.get(`/search?q=${encodeURIComponent(query)}`).then(res => setResults(res.data.results)).catch(console.error).finally(() => setLoading(false));
    }
  }, [query, api]);

  const typeConfig = {
    crop_diseases: { icon: '🔬', label: 'Crop Diseases', path: '/crop-diseases' },
    irrigation: { icon: '💧', label: 'Irrigation', path: '/irrigation' },
    harvest: { icon: '📊', label: 'Harvest', path: '/harvest' },
    pests: { icon: '🐛', label: 'Pests', path: '/pests' },
    soil: { icon: '🌱', label: 'Soil', path: '/soil' }
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header"><div><h1 className="page-title">🔍 Search Results</h1><p className="page-description">Results for "{query}" - {results?.total || 0} matches found</p></div></div>
      {loading ? <div className="loading"><div className="loading-spinner"></div></div> :
      results && Object.entries(typeConfig).map(([key, config]) => {
        const items = results[key] || [];
        if (items.length === 0) return null;
        return (
          <div key={key} className="card mb-2">
            <div className="card-header"><h3>{config.icon} {config.label} ({items.length})</h3></div>
            <div className="card-body">
              {items.map(item => (
                <div key={item.id} className="search-result-item" onClick={() => navigate(config.path)} tabIndex={0} role="link">
                  <strong>{item.crop_name || item.field_name || item.pest_name || item.sample_location}</strong>
                  <span style={{color: 'var(--text-secondary)', marginLeft: '12px'}}>{item.disease_name || item.crop_type || item.affected_crop || item.soil_texture || ''}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
