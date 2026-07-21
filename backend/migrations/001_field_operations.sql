CREATE TABLE IF NOT EXISTS field_observations (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_id INTEGER NOT NULL REFERENCES field_locations(id) ON DELETE CASCADE,
  client_observation_id VARCHAR(160) NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  source_type VARCHAR(40) NOT NULL,
  source_ref VARCHAR(255),
  captured_offline BOOLEAN NOT NULL DEFAULT FALSE,
  metrics JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, client_observation_id)
);

CREATE TABLE IF NOT EXISTS field_operation_plans (
  id BIGSERIAL PRIMARY KEY,
  observation_id BIGINT NOT NULL UNIQUE REFERENCES field_observations(id) ON DELETE CASCADE,
  ruleset_version VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected','completed')),
  decision JSONB NOT NULL,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_work_orders (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT NOT NULL REFERENCES field_operation_plans(id) ON DELETE CASCADE,
  action_type VARCHAR(120) NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low','medium','high')),
  status VARCHAR(30) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','in_progress','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_operation_alerts (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT NOT NULL REFERENCES field_operation_plans(id) ON DELETE CASCADE,
  code VARCHAR(120) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low','medium','high')),
  evidence JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_observations_field_time ON field_observations(field_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_operation_plans_status ON field_operation_plans(status);
