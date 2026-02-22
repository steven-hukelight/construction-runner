-- Add columns for medical, training, and declarations sections (web form compatibility)
ALTER TABLE pre_induction_training ADD COLUMN IF NOT EXISTS rams_accepted_at TIMESTAMPTZ;
ALTER TABLE pre_induction_training ADD COLUMN IF NOT EXISTS rams_version TEXT;

ALTER TABLE pre_induction_medical ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE pre_induction_medical ADD COLUMN IF NOT EXISTS medication TEXT;
ALTER TABLE pre_induction_medical ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE pre_induction_declarations ADD COLUMN IF NOT EXISTS operative_signature_url TEXT;
ALTER TABLE pre_induction_declarations ADD COLUMN IF NOT EXISTS operative_declaration_accepted_at TIMESTAMPTZ;
ALTER TABLE pre_induction_declarations ADD COLUMN IF NOT EXISTS supervisor_declaration_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE pre_induction_declarations ADD COLUMN IF NOT EXISTS supervisor_declaration_accepted_at TIMESTAMPTZ;
ALTER TABLE pre_induction_declarations ADD COLUMN IF NOT EXISTS notes TEXT;
