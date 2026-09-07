-- Per-document RAMS acknowledgements (operative-facing, mirrors briefing_acknowledgements)
-- rams_id is TEXT to match rams.id (supports opaque string ids as well as UUID strings).
CREATE TABLE IF NOT EXISTS rams_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rams_id TEXT NOT NULL REFERENCES rams(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  signature_url TEXT,
  UNIQUE(user_id, rams_id)
);

CREATE INDEX IF NOT EXISTS idx_rams_acknowledgements_user_id ON rams_acknowledgements(user_id);
CREATE INDEX IF NOT EXISTS idx_rams_acknowledgements_rams_id ON rams_acknowledgements(rams_id);
ALTER TABLE rams_acknowledgements ENABLE ROW LEVEL SECURITY;
