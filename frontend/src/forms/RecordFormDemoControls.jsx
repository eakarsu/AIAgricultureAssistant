import React from 'react';
import { recordFormExamples } from './RecordFormExamples';
export default function RecordFormDemoControls({ kind, onFill, busy }) {
  return <div className="farm-record-demo" aria-label="Complete fictional request examples" style={{ marginBottom: 20, padding: 16, border: '1px solid var(--border, #dfe4ee)', borderRadius: 10 }}>
    <strong>Demo AI · Fill all fields</strong><p>Each choice fills every editable input, including optional fields. All measurements, dates and locations below are fictional training examples, not verified farm observations. Review them before choosing the separate analysis and save action.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{recordFormExamples[kind].map(example => <button key={example.name} type="button" className="btn btn-outline" disabled={busy} onClick={() => onFill({ ...example.fields })}>Demo AI · {example.name}</button>)}</div>
  </div>;
}
