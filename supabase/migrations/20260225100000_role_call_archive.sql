-- Role call archive: daily fire roll call snapshots (preserved when day is cleared)
CREATE TABLE IF NOT EXISTS role_call_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  site_id TEXT,
  archive_date DATE NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_role_call_archive_company_date ON role_call_archive(company_id, archive_date DESC);
CREATE INDEX IF NOT EXISTS idx_role_call_archive_site ON role_call_archive(site_id) WHERE site_id IS NOT NULL;
ALTER TABLE role_call_archive ENABLE ROW LEVEL SECURITY;
