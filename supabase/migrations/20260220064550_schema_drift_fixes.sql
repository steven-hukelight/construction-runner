-- Schema drift fixes - auto-generated
-- Only adds columns/indexes for tables that exist in live DB
-- Review: deliveries may use created_by (live) vs delivered_by (migrations) - verify API expects delivered_by

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
-- Policy placeholder on companies (add manually if needed)
-- Policy placeholder on users (add manually if needed)
-- Policy placeholder on sites (add manually if needed)