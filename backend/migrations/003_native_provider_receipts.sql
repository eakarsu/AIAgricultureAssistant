ALTER TABLE ai_results ADD COLUMN IF NOT EXISTS provider_receipt JSONB;
ALTER TABLE ai_results ADD COLUMN IF NOT EXISTS submitted_input JSONB;
