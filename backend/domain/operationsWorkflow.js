'use strict';

const SOURCE_TYPES = new Set(['manual', 'sensor', 'lab', 'weather', 'gis', 'farm_system']);
const RULESET_VERSION = 'field-operations-2026-07-18';

function validateObservation(input = {}) {
  const errors = [];
  if (!Number.isInteger(Number(input.field_id)) || Number(input.field_id) < 1) errors.push('field_id must be a positive integer');
  if (typeof input.client_observation_id !== 'string' || !input.client_observation_id.trim()) errors.push('client_observation_id is required');
  if (!input.observed_at || Number.isNaN(Date.parse(input.observed_at))) errors.push('observed_at must be an ISO timestamp');
  if (!input.source || !SOURCE_TYPES.has(input.source.type)) errors.push(`source.type must be one of ${[...SOURCE_TYPES].join(', ')}`);
  if (!input.metrics || typeof input.metrics !== 'object' || Array.isArray(input.metrics)) errors.push('metrics must be an object');
  for (const key of ['soil_moisture_pct', 'temperature_c', 'pest_pressure']) {
    if (input.metrics?.[key] !== undefined && !Number.isFinite(Number(input.metrics[key]))) errors.push(`${key} must be numeric`);
  }
  return errors;
}

function buildOperationsDraft(input) {
  const metrics = input.metrics || {};
  const alerts = [];
  const actions = [];
  const moisture = Number(metrics.soil_moisture_pct);
  const temperature = Number(metrics.temperature_c);
  const pestPressure = Number(metrics.pest_pressure);

  if (Number.isFinite(moisture) && moisture < 20) {
    alerts.push({ code: 'LOW_SOIL_MOISTURE', severity: moisture < 10 ? 'high' : 'medium', evidence: { soil_moisture_pct: moisture } });
    actions.push({ type: 'VERIFY_IRRIGATION_NEED', priority: moisture < 10 ? 'high' : 'medium' });
  }
  if (Number.isFinite(temperature) && temperature >= 38) {
    alerts.push({ code: 'HEAT_STRESS_REVIEW', severity: temperature >= 43 ? 'high' : 'medium', evidence: { temperature_c: temperature } });
    actions.push({ type: 'FIELD_HEAT_STRESS_INSPECTION', priority: 'high' });
  }
  if (Number.isFinite(pestPressure) && pestPressure >= 3) {
    alerts.push({ code: 'PEST_PRESSURE_REVIEW', severity: pestPressure >= 7 ? 'high' : 'medium', evidence: { pest_pressure: pestPressure } });
    actions.push({ type: 'SCOUT_AND_DOCUMENT_PESTS', priority: pestPressure >= 7 ? 'high' : 'medium' });
  }
  if (actions.length === 0) actions.push({ type: 'ROUTINE_FIELD_REVIEW', priority: 'low' });

  return {
    ruleset_version: RULESET_VERSION,
    status: 'draft',
    requires_approval: true,
    automatic_execution: false,
    alerts,
    actions,
    provenance: {
      source_type: input.source.type,
      source_ref: input.source.external_id || null,
      captured_offline: Boolean(input.source.captured_offline),
      observed_at: input.observed_at,
    },
  };
}

module.exports = { RULESET_VERSION, SOURCE_TYPES, validateObservation, buildOperationsDraft };
