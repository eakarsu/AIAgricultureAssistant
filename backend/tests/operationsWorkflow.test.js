const test = require('node:test');
const assert = require('node:assert/strict');
const { validateObservation, buildOperationsDraft } = require('../domain/operationsWorkflow');

test('field workflow validates provenance and creates approval-gated actions', () => {
  const input = { field_id: 7, client_observation_id: 'offline-42', observed_at: '2026-07-18T12:00:00Z', source: { type: 'sensor', external_id: 'probe-9', captured_offline: true }, metrics: { soil_moisture_pct: 8, temperature_c: 41, pest_pressure: 4 } };
  assert.deepEqual(validateObservation(input), []);
  const draft = buildOperationsDraft(input);
  assert.equal(draft.requires_approval, true);
  assert.equal(draft.automatic_execution, false);
  assert.ok(draft.alerts.some((item) => item.code === 'LOW_SOIL_MOISTURE'));
  assert.ok(draft.actions.some((item) => item.type === 'SCOUT_AND_DOCUMENT_PESTS'));
  assert.equal(draft.provenance.source_ref, 'probe-9');
});

test('field workflow rejects untraceable input', () => {
  assert.ok(validateObservation({ metrics: {} }).length >= 4);
});
