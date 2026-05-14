import React from 'react';
import SimpleAIPage from './SimpleAIPage';

export default function IrrigationOptimizeTextPage() {
  return (
    <SimpleAIPage
      title="Irrigation Optimizer (text-based)"
      description="Paste a snapshot of soil moisture / weather / crop stage; AI proposes a 7-day irrigation schedule. IoT-stream variant is on the roadmap."
      endpoint="/ai/irrigation-optimize-text"
      fields={[
        { name: 'crop_type', label: 'Crop Type', placeholder: 'e.g. Corn, Tomato' },
        { name: 'field_id', label: 'Field ID (optional)' },
        { name: 'snapshot', label: 'Snapshot (paste text or JSON)', type: 'textarea', required: true, rows: 8, placeholder: 'e.g. Soil moisture 18% at 30cm, crop stage V8, ET0 6mm/day, forecast: hot+dry next 5 days.' },
      ]}
    />
  );
}
