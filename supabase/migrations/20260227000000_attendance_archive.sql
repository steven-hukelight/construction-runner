-- Attendance archive: daily snapshots preserved when live list is cleared.
-- At 00:00 each day, entries from attendance are moved here; live list starts empty.
CREATE TABLE IF NOT EXISTS attendance_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id UUID,
  company_id TEXT NOT NULL,
  action TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  accuracy NUMERIC,
  email TEXT,
  archive_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attendance_archive_company_date ON attendance_archive(company_id, archive_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_archive_site ON attendance_archive(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_archive_timestamp ON attendance_archive(timestamp DESC);
-- No RLS policies: same backend-only model as public.attendance (service_role / server-side).
ALTER TABLE attendance_archive ENABLE ROW LEVEL SECURITY;
