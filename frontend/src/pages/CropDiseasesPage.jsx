import React from 'react';
import ListPage from '../components/ListPage';
import SeverityBadge from '../components/SeverityBadge';
import CropDiseaseForm from '../forms/CropDiseaseForm';

export default function CropDiseasesPage() {
  return (
    <ListPage
      title="Crop Disease Detector" description="AI-powered plant disease identification and treatment recommendations"
      apiEndpoint="/crop-diseases" icon="🔬" emptyIcon="🌿" emptyTitle="No disease records yet"
      emptyDescription="Add your first crop disease observation for AI analysis"
      columns={[
        { key: 'crop_name', label: 'Crop' },
        { key: 'disease_name', label: 'Disease', render: (v) => v || 'Pending Analysis' },
        { key: 'severity', label: 'Severity', render: (v) => <SeverityBadge severity={v} /> },
        { key: 'location', label: 'Location' },
        { key: 'confidence_score', label: 'Confidence', render: (v) => v ? `${v}%` : '-' },
        { key: 'detected_date', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' }
      ]}
      FormComponent={CropDiseaseForm}
    />
  );
}
