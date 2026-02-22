-- Messaging: in-app messages scoped by company
-- company_id as TEXT to match companies.id (type varies by deployment)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  sender_id UUID,
  sender_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_company_id ON messages(company_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Assets: equipment, vehicles, tools by company (optionally by site)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  site_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'equipment',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_company_id ON assets(company_id);
CREATE INDEX IF NOT EXISTS idx_assets_site_id ON assets(site_id);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Offline sync log: items created offline and synced when back online
CREATE TABLE IF NOT EXISTS offline_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  content TEXT NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offline_sync_log_company_id ON offline_sync_log(company_id);

ALTER TABLE offline_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS: Service role bypasses. For API routes using supabaseAdmin, RLS is bypassed.
-- If using anon key, add policies; for admin-only API we rely on API auth.
