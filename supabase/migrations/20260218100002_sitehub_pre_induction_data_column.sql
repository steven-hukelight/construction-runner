-- SiteHub: add "data" JSONB to pre_induction tables for APIs that expect it
-- (gdpr/download-my-data, supervisor/operative-drawer, subcontractor/request-verification)

ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE pre_induction_right_to_work ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE pre_induction_certifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE pre_induction_medical ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE pre_induction_declarations ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
