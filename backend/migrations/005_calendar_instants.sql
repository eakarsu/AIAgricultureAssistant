-- Add an exact instant for new explicit calendar inputs; retain every legacy wall-time value.
CREATE TABLE IF NOT EXISTS irrigation_schedules (
 id SERIAL PRIMARY KEY,
 user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
 zone VARCHAR(255) NOT NULL,
 start_time TIMESTAMP NOT NULL,
 duration_minutes INTEGER NOT NULL,
 recurrence VARCHAR(50) DEFAULT 'once',
 status VARCHAR(50) DEFAULT 'scheduled',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE irrigation_schedules ADD COLUMN IF NOT EXISTS start_instant TIMESTAMPTZ;
COMMENT ON COLUMN irrigation_schedules.start_instant IS 'Exact instant supplied for new native calendar records/explicit edits. NULL retains the original legacy wall-time contract; no original date is backfilled.';
