import React, { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import FieldMap from '../components/FieldMap';
import CropYieldChart from '../components/CropYieldChart';
import PlantingPlanPDF from '../components/PlantingPlanPDF';
import IrrigationScheduler from '../components/IrrigationScheduler';

const VIEWS = [
  { key: 'map', label: 'Field Map', icon: '🗺️' },
  { key: 'yield', label: 'Crop Yield Chart', icon: '📈' },
  { key: 'plan', label: 'Planting Plan PDF', icon: '📄' },
  { key: 'irrigation', label: 'Irrigation Scheduler', icon: '💧' }
];

export default function CustomViewsPage() {
  const [active, setActive] = useState('map');

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      gap: 20,
      maxWidth: 1280,
      margin: '20px auto',
      padding: '0 16px'
    }}>
      {/* Sidebar */}
      <aside className="custom-views-sidebar" aria-label="Farm Views navigation" style={{
        background: 'var(--card-background)',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        padding: 12,
        height: 'fit-content',
        position: 'sticky',
        top: 80
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: '1rem', color: 'var(--text-primary)' }}>
          Farm Views
        </h3>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setActive(v.key)}
              aria-current={active === v.key ? 'page' : undefined}
              style={{
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid transparent',
                background: active === v.key ? 'rgba(46,125,50,0.12)' : 'transparent',
                color: active === v.key ? '#2e7d32' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              <span style={{ marginRight: 8 }} aria-hidden="true">{v.icon}</span>
              {v.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main panel */}
      <section>
        <h2 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Custom Farm Views</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
          Map, charts, planting plans, and irrigation scheduling for your fields.
        </p>

        {active === 'map' && <FieldMap />}
        {active === 'yield' && <CropYieldChart />}
        {active === 'plan' && <PlantingPlanPDF />}
        {active === 'irrigation' && <IrrigationScheduler />}
      </section>
    </div>
  );
}
