-- Plain native planning drafts have no observation and cannot pass the observation approval route.
ALTER TABLE field_operation_plans ALTER COLUMN observation_id DROP NOT NULL;
ALTER TABLE field_operation_plans ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE field_operation_plans ADD COLUMN IF NOT EXISTS field_id INTEGER REFERENCES field_locations(id);
ALTER TABLE field_operation_plans ADD COLUMN IF NOT EXISTS planning_input JSONB;
ALTER TABLE field_operation_plans ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE field_operation_plans ADD COLUMN IF NOT EXISTS demo_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS field_operation_plans_native_demo_key ON field_operation_plans(user_id,demo_key) WHERE demo_key IS NOT NULL;
