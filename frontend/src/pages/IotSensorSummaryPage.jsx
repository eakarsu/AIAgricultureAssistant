import React from 'react';
import SimpleAIPage from './SimpleAIPage';

export default function IotSensorSummaryPage() {
  return (
    <SimpleAIPage
      title="IoT Sensor Summary"
      description="Paste sensor readings (CSV / JSON / text); AI surfaces anomalies, trends, and recommended actions. Direct vendor integrations (Phytos, Indigo, John Deere) require credentials."
      endpoint="/ai/iot-sensor-summary"
      fields={[
        { name: 'field_id', label: 'Field ID (optional)' },
        { name: 'readings', label: 'Sensor Readings', type: 'textarea', required: true, rows: 10, placeholder: 'e.g. ts,sensor,value\\n2025-05-01T08:00,soil_moisture_30cm,22\\n2025-05-01T08:00,air_temp,18\\n...' },
      ]}
    />
  );
}
