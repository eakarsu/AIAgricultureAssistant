import React from 'react';
import ListPage from '../components/ListPage';
import SoilForm from '../forms/SoilForm';

export default function SoilPage() {
  return (
    <ListPage
      title="Soil Analyzer" description="AI-powered soil health assessment and fertility recommendations"
      apiEndpoint="/soil" icon="🌱" emptyIcon="🧪" emptyTitle="No soil analyses yet"
      emptyDescription="Add your first soil sample for AI analysis"
      columns={[
        { key: 'field_name', label: 'Field' }, { key: 'sample_location', label: 'Location' },
        { key: 'ph_level', label: 'pH' }, { key: 'soil_texture', label: 'Texture' },
        { key: 'organic_matter', label: 'Organic Matter', render: (v) => v ? `${v}%` : '-' },
        { key: 'health_score', label: 'Health Score', render: (v) => v ? <span className={`badge ${v >= 70 ? 'badge-success' : v >= 50 ? 'badge-warning' : 'badge-danger'}`}>{v}/100</span> : '-' }
      ]}
      FormComponent={SoilForm}
    />
  );
}
