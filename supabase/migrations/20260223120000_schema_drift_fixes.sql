-- Schema drift fixes - consolidates columns/indexes for notices, deliveries, tasks
-- Idempotent: uses IF NOT EXISTS

ALTER TABLE notices ADD COLUMN IF NOT EXISTS site_id UUID;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS attachments JSONB;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivered_by UUID;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS proof_photos JSONB;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks (company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_notices_company_id ON notices (company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_company_id ON deliveries (company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_site_id ON deliveries (site_id);
