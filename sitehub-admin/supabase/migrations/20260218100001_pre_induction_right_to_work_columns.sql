-- Add columns to pre_induction_right_to_work for API compatibility
ALTER TABLE pre_induction_right_to_work ADD COLUMN IF NOT EXISTS passport_expiry TIMESTAMPTZ;
ALTER TABLE pre_induction_right_to_work ADD COLUMN IF NOT EXISTS visa_expiry TIMESTAMPTZ;
ALTER TABLE pre_induction_right_to_work ADD COLUMN IF NOT EXISTS proof_of_address_url TEXT;
ALTER TABLE pre_induction_right_to_work ADD COLUMN IF NOT EXISTS notes TEXT;
