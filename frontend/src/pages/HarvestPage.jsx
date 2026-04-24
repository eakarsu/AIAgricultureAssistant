import React from 'react';
import ListPage from '../components/ListPage';
import HarvestForm from '../forms/HarvestForm';

export default function HarvestPage() {
  return (
    <ListPage
      title="Harvest Predictor" description="AI-powered yield forecasting and harvest timing optimization"
      apiEndpoint="/harvest" icon="📊" emptyIcon="🌾" emptyTitle="No harvest predictions yet"
      emptyDescription="Add your first crop for AI yield prediction"
      columns={[
        { key: 'field_name', label: 'Field' }, { key: 'crop_type', label: 'Crop' },
        { key: 'current_growth_stage', label: 'Growth Stage' },
        { key: 'health_status', label: 'Health', render: (v) => <span className={`badge ${v === 'Excellent' ? 'badge-success' : v === 'Good' ? 'badge-info' : 'badge-warning'}`}>{v || '-'}</span> },
        { key: 'predicted_yield', label: 'Predicted Yield', render: (v, r) => v ? `${v} ${r.yield_unit || ''}` : '-' },
        { key: 'expected_harvest_date', label: 'Harvest Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' }
      ]}
      FormComponent={HarvestForm}
    />
  );
}
