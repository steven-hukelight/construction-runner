-- Ensure pre_induction_personal has all required columns (matches 20250220000005)
-- Fixes: "could not find the date_of_birth column in schema cache"

ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;
ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS national_insurance TEXT;
ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS utr TEXT;
