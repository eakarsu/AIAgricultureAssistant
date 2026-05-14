import React from 'react';
import SimpleAIPage from './SimpleAIPage';

export default function SustainabilityScorePage() {
  return (
    <SimpleAIPage
      title="Sustainability Score"
      description="Composite 0-100 score across soil, water, biodiversity, GHG, and inputs. Framework caveat is included so a formal rubric (COMET-Farm, FAO SAFA) can be slotted in later."
      endpoint="/ai/sustainability-score"
      fields={[
        { name: 'farm_summary', label: 'Farm Summary (paste text or JSON)', type: 'textarea', required: true, rows: 10, placeholder: 'Acreage, crops, tillage system, cover crops, irrigation, fertilizer/pesticide use, energy sources, conservation practices...' },
        { name: 'field_id', label: 'Field ID (optional)' },
      ]}
    />
  );
}
