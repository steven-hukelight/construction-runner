-- Near miss reports: safety incidents submitted by operatives (H&S tab)
CREATE TABLE IF NOT EXISTS near_miss (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  site_id TEXT,
  operative_id UUID,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_near_miss_company_id ON near_miss(company_id);
CREATE INDEX IF NOT EXISTS idx_near_miss_reviewed ON near_miss(company_id) WHERE reviewed_at IS NULL;

ALTER TABLE near_miss ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service_role" ON near_miss
  FOR ALL USING (auth.role() = 'service_role');
