-- Registered office / contact: required in app for company settings and superuser onboarding
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_contact_name TEXT;

COMMENT ON COLUMN companies.address IS 'Registered or principal company address (required in app when saving company details)';
COMMENT ON COLUMN companies.primary_contact_name IS 'Primary contact / requestee name (e.g. at company creation)';
