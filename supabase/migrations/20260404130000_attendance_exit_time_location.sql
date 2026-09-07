-- Exit-time fallback: explicit exit_time + exit coordinates on sign-out rows.

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS exit_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exit_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS exit_longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS exit_accuracy NUMERIC;

ALTER TABLE attendance_archive
  ADD COLUMN IF NOT EXISTS exit_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exit_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS exit_longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS exit_accuracy NUMERIC;
