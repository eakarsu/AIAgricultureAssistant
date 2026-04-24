import React from 'react';
import ListPage from '../components/ListPage';
import IrrigationForm from '../forms/IrrigationForm';

export default function IrrigationPage() {
  return (
    <ListPage
      title="Irrigation Optimizer" description="Smart water management with AI-driven irrigation recommendations"
      apiEndpoint="/irrigation" icon="💧" emptyIcon="🚿" emptyTitle="No irrigation records yet"
      emptyDescription="Add your first field for AI irrigation optimization"
      columns={[
        { key: 'field_name', label: 'Field' }, { key: 'crop_type', label: 'Crop' },
        { key: 'field_size', label: 'Size (acres)' },
        { key: 'current_moisture', label: 'Moisture', render: (v) => v ? `${v}%` : '-' },
        { key: 'weather_condition', label: 'Weather' },
        { key: 'efficiency_score', label: 'Efficiency', render: (v) => v ? `${v}%` : '-' }
      ]}
      FormComponent={IrrigationForm}
    />
  );
}
