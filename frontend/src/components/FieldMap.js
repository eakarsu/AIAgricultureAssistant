import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../contexts/AuthContext';

// Fix Leaflet default icon paths for webpack/react-scripts.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

function moistureToColor(m) {
  // Dry = brown, wet = blue
  if (m == null) return '#9e9e9e';
  if (m < 0.3) return '#a1887f';
  if (m < 0.45) return '#fbc02d';
  if (m < 0.6) return '#43a047';
  return '#1e88e5';
}

export default function FieldMap() {
  const [fields, setFields] = useState([]);
  const [colorBy, setColorBy] = useState('crop'); // 'crop' | 'moisture'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    api.get('/custom-views/fields-geo')
      .then((res) => {
        if (!mounted) return;
        setFields(res.data.records || []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.response?.data?.error || e.message || 'Failed to load fields');
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const center = fields.length
    ? fields[0].center
    : [39.5, -98.35]; // approx US centroid fallback

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid var(--border-color)'
      }}>
        <h3 style={{ margin: 0 }}>Field Map</h3>
        <div>
          <label style={{ marginRight: 8, fontSize: '0.85rem' }}>Color by:</label>
          <select value={colorBy} onChange={(e) => setColorBy(e.target.value)}>
            <option value="crop">Crop type</option>
            <option value="moisture">Soil moisture</option>
          </select>
        </div>
      </div>

      {loading && <div style={{ padding: 16 }}>Loading map...</div>}
      {error && <div style={{ padding: 16, color: '#c62828' }}>Error: {error}</div>}
      {!loading && !error && fields.length === 0 && (
        <div style={{ padding: 16 }}>No field locations on record. Add fields under the Fields page first.</div>
      )}

      {!loading && !error && fields.length > 0 && (
        <MapContainer
          center={center}
          zoom={6}
          style={{ height: 480, width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {fields.map((f) => {
            const fillColor = colorBy === 'moisture'
              ? moistureToColor(f.soil_moisture)
              : (f.color || '#2e7d32');

            return (
              <React.Fragment key={f.id}>
                <Polygon
                  positions={f.polygon}
                  pathOptions={{
                    color: fillColor,
                    fillColor,
                    fillOpacity: 0.45,
                    weight: 2
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <strong>{f.name}</strong><br />
                      Crop: {f.crop_type || '—'}<br />
                      Soil: {f.soil_type || '—'}<br />
                      Area: {f.area_size ? `${f.area_size} ${f.area_unit}` : '—'}<br />
                      Soil moisture: {(f.soil_moisture * 100).toFixed(0)}%
                    </div>
                  </Popup>
                </Polygon>
                <CircleMarker
                  center={f.center}
                  radius={3}
                  pathOptions={{ color: '#111', fillColor: '#111', fillOpacity: 1 }}
                />
              </React.Fragment>
            );
          })}
        </MapContainer>
      )}
    </div>
  );
}
