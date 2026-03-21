-- Add rams_status column for RAMS compliance status (e.g. 'ok', 'outdated')
ALTER TABLE pre_induction_training ADD COLUMN IF NOT EXISTS rams_status TEXT;
