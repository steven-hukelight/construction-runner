-- Task attachments: images and documents for tasks
-- tasks.id is TEXT in this schema
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Site rules: add file_url for emergency procedures
ALTER TABLE site_rules ADD COLUMN IF NOT EXISTS file_url TEXT;
