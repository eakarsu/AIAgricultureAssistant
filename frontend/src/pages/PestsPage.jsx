import React from 'react';
import ListPage from '../components/ListPage';
import SeverityBadge from '../components/SeverityBadge';
import PestForm from '../forms/PestForm';

export default function PestsPage() {
  return (
    <ListPage
      title="Pest Identifier" description="AI-powered pest identification and integrated pest management"
      apiEndpoint="/pests" icon="🐛" emptyIcon="🔍" emptyTitle="No pest records yet"
      emptyDescription="Add your first pest observation for AI identification"
      columns={[
        { key: 'pest_name', label: 'Pest', render: (v) => v || 'Pending ID' },
        { key: 'pest_type', label: 'Type' }, { key: 'affected_crop', label: 'Affected Crop' },
        { key: 'severity', label: 'Severity', render: (v) => <SeverityBadge severity={v} /> },
        { key: 'infestation_level', label: 'Level' },
        { key: 'confidence_score', label: 'Confidence', render: (v) => v ? `${v}%` : '-' }
      ]}
      FormComponent={PestForm}
    />
  );
}
