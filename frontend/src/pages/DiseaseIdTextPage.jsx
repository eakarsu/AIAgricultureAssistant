import React from 'react';
import SimpleAIPage from './SimpleAIPage';

export default function DiseaseIdTextPage() {
  return (
    <SimpleAIPage
      title="Disease ID (text-based)"
      description="Describe leaf/plant symptoms; AI suggests likely diseases, pests, or nutrient disorders. Image-based ID is on the roadmap."
      endpoint="/ai/disease-id-text"
      fields={[
        { name: 'crop_type', label: 'Crop Type', required: true, placeholder: 'e.g. Tomato, Corn, Wheat' },
        { name: 'symptoms_description', label: 'Symptoms Description', type: 'textarea', required: true, rows: 8, placeholder: 'e.g. Lower leaves yellowing with brown lesions; spots show concentric rings; plant wilting in afternoon heat.' },
        { name: 'field_id', label: 'Field ID (optional)' },
      ]}
    />
  );
}
