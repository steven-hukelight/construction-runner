-- Offline queue: items created offline by mobile, synced when online
-- user_id links to users.id; company_id derived from user for admin filtering
CREATE TABLE IF NOT EXISTS offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_user_id ON offline_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_company_id ON offline_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_synced_at ON offline_queue(synced_at) WHERE synced_at IS NULL;

ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;
