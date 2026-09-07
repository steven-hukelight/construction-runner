-- Hybrid auto sign-out: explicit columns + session tracking for server fallback.
-- Sign-in rows are updated by POST attendance_session_ping (last known location / activity).

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS auto_sign_out BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_sign_out_reason TEXT,
  ADD COLUMN IF NOT EXISTS exit_time_millis BIGINT,
  ADD COLUMN IF NOT EXISTS last_known_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS last_known_longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS last_known_accuracy NUMERIC,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

ALTER TABLE attendance_archive
  ADD COLUMN IF NOT EXISTS auto_sign_out BOOLEAN,
  ADD COLUMN IF NOT EXISTS auto_sign_out_reason TEXT,
  ADD COLUMN IF NOT EXISTS exit_time_millis BIGINT,
  ADD COLUMN IF NOT EXISTS last_known_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS last_known_longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS last_known_accuracy NUMERIC,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_attendance_user_timestamp_desc ON attendance (user_id, timestamp DESC);
