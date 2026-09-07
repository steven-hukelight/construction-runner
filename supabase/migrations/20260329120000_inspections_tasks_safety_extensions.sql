-- Inspection extensions: status, step timestamps; multi-image; comments.
-- Task comments. Safety checklist completions.

ALTER TABLE asset_inspections
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN asset_inspections.status IS 'open | completed — workflow for close inspection';
COMMENT ON COLUMN asset_inspections.steps IS 'Array of { "key": string, "at": ISO8601, "note"?: string }';

UPDATE asset_inspections SET status = 'completed' WHERE status IS NULL;

CREATE TABLE IF NOT EXISTS asset_inspection_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES asset_inspections(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_inspection_images_inspection_id
  ON asset_inspection_images(inspection_id);

CREATE TABLE IF NOT EXISTS asset_inspection_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES asset_inspections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_inspection_comments_inspection_id
  ON asset_inspection_comments(inspection_id);

-- Task comments (task_id matches tasks.id / task_attachments — opaque text)
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

-- Daily / on-site safety checklist submissions (items = JSON array of { id, label, done })
-- company_id: TEXT to match companies.id (opaque string ids in this schema; not always UUID)
CREATE TABLE IF NOT EXISTS safety_checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_safety_checklist_company_submitted
  ON safety_checklist_completions(company_id, submitted_at DESC);

ALTER TABLE asset_inspection_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_inspection_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_checklist_completions ENABLE ROW LEVEL SECURITY;
