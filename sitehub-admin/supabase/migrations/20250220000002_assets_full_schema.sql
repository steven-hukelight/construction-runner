-- Extend assets table and add asset_assignments, asset_inspections, asset_documents
-- Add columns to assets if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='category') THEN
    ALTER TABLE assets ADD COLUMN category TEXT DEFAULT 'equipment';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='serial_number') THEN
    ALTER TABLE assets ADD COLUMN serial_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='condition') THEN
    ALTER TABLE assets ADD COLUMN condition TEXT DEFAULT 'good';
  END IF;
END $$;

-- asset_assignments: who has which asset
CREATE TABLE IF NOT EXISTS asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset_id ON asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_user_id ON asset_assignments(user_id);

ALTER TABLE asset_assignments ENABLE ROW LEVEL SECURITY;

-- asset_inspections: inspection logs with photo
CREATE TABLE IF NOT EXISTS asset_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_inspections_asset_id ON asset_inspections(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_inspections_user_id ON asset_inspections(user_id);

ALTER TABLE asset_inspections ENABLE ROW LEVEL SECURITY;

-- asset_documents: certs and files
CREATE TABLE IF NOT EXISTS asset_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_documents_asset_id ON asset_documents(asset_id);

ALTER TABLE asset_documents ENABLE ROW LEVEL SECURITY;
