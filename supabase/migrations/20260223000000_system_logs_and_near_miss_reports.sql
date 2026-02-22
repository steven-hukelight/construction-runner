-- system_logs: for superuser system logs screen (clear logs action)
-- near_miss_reports: near-miss reporting module (replaces dropped near_miss)

-- =============================================================================
-- 1. system_logs table
-- =============================================================================
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  source TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Only superusers and service_role can access
CREATE POLICY superuser_system_logs_all ON system_logs FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

-- =============================================================================
-- 2. near_miss_reports table (for mobile near-miss module)
-- =============================================================================
CREATE TABLE IF NOT EXISTS near_miss_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  site_id TEXT,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_near_miss_reports_company_id ON near_miss_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_near_miss_reports_reported_by ON near_miss_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_near_miss_reports_reviewed ON near_miss_reports(company_id) WHERE reviewed_at IS NULL;

ALTER TABLE near_miss_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY superuser_near_miss_reports_all ON near_miss_reports FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());
CREATE POLICY admin_company_near_miss_reports ON near_miss_reports FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());
CREATE POLICY operative_insert_near_miss_reports ON near_miss_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (reported_by = auth.uid() OR reported_by IS NULL));
CREATE POLICY operative_read_own_near_miss_reports ON near_miss_reports FOR SELECT
  USING (auth.uid() IS NOT NULL AND (reported_by = auth.uid() OR company_id = auth_user_company_id()));
