-- =============================================================================
-- PHASE 1: SCHEMA CLEANUP
-- =============================================================================
-- DO NOT EXECUTE until reviewed and approved.
-- No destructive operations on data. Only schema changes: backfill, drop dupes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: BACKFILL - Copy camelCase → snake_case where snake_case is NULL
-- Order matters: parent tables before child (companies before users/sites)
-- -----------------------------------------------------------------------------

-- companies
UPDATE companies SET created_at = createdat WHERE created_at IS NULL AND createdat IS NOT NULL;

-- users
UPDATE users SET company_id = companyid WHERE company_id IS NULL AND companyid IS NOT NULL;
UPDATE users SET profile_id = profileid WHERE profile_id IS NULL AND profileid IS NOT NULL;
UPDATE users SET created_at = createdat WHERE created_at IS NULL AND createdat IS NOT NULL;

-- sites
UPDATE sites SET company_id = companyid WHERE company_id IS NULL AND companyid IS NOT NULL;
UPDATE sites SET created_at = createdat WHERE created_at IS NULL AND createdat IS NOT NULL;
UPDATE sites SET assigned_users = assignedusers WHERE assigned_users IS NULL AND assignedusers IS NOT NULL;
UPDATE sites SET rams_version = ramsversion WHERE rams_version IS NULL AND ramsversion IS NOT NULL;
UPDATE sites SET main_contractor_id = maincontractorid WHERE main_contractor_id IS NULL AND maincontractorid IS NOT NULL;

-- attendance
UPDATE attendance SET user_id = userid WHERE user_id IS NULL AND userid IS NOT NULL;
UPDATE attendance SET site_id = siteid WHERE site_id IS NULL AND siteid IS NOT NULL;
UPDATE attendance SET company_id = companyid WHERE company_id IS NULL AND companyid IS NOT NULL;

-- tasks
UPDATE tasks SET site_id = siteid WHERE site_id IS NULL AND siteid IS NOT NULL;
UPDATE tasks SET company_id = companyid WHERE company_id IS NULL AND companyid IS NOT NULL;
UPDATE tasks SET assigned_to = assignedto WHERE assigned_to IS NULL AND assignedto IS NOT NULL;
UPDATE tasks SET created_at = createdat WHERE created_at IS NULL AND createdat IS NOT NULL;

-- notices
UPDATE notices SET site_id = siteid WHERE site_id IS NULL AND siteid IS NOT NULL;
UPDATE notices SET company_id = companyid WHERE company_id IS NULL AND companyid IS NOT NULL;
UPDATE notices SET created_at = createdat WHERE created_at IS NULL AND createdat IS NOT NULL;

-- deliveries
UPDATE deliveries SET site_id = siteid WHERE site_id IS NULL AND siteid IS NOT NULL;
UPDATE deliveries SET company_id = companyid WHERE company_id IS NULL AND companyid IS NOT NULL;
UPDATE deliveries SET delivered_by = deliveredby WHERE delivered_by IS NULL AND deliveredby IS NOT NULL;
UPDATE deliveries SET proof_photos = proofphotos WHERE proof_photos IS NULL AND proofphotos IS NOT NULL;
UPDATE deliveries SET created_at = createdat WHERE created_at IS NULL AND createdat IS NOT NULL;

-- rams
UPDATE rams SET site_id = siteid WHERE site_id IS NULL AND siteid IS NOT NULL;
UPDATE rams SET company_id = companyid WHERE company_id IS NULL AND companyid IS NOT NULL;
UPDATE rams SET file_url = fileurl WHERE file_url IS NULL AND fileurl IS NOT NULL;
UPDATE rams SET created_at = createdat WHERE created_at IS NULL AND createdat IS NOT NULL;

-- briefings
UPDATE briefings SET company_id = companyid WHERE company_id IS NULL AND companyid IS NOT NULL;
UPDATE briefings SET site_id = siteid WHERE site_id IS NULL AND siteid IS NOT NULL;
UPDATE briefings SET created_at = createdat WHERE created_at IS NULL AND createdat IS NOT NULL;

-- coshh
UPDATE coshh SET company_id = companyid WHERE company_id IS NULL AND companyid IS NOT NULL;
UPDATE coshh SET created_at = createdat WHERE created_at IS NULL AND createdat IS NOT NULL;

-- site_rules
UPDATE site_rules SET company_id = companyid WHERE company_id IS NULL AND companyid IS NOT NULL;
UPDATE site_rules SET created_at = createdat WHERE created_at IS NULL AND createdat IS NOT NULL;

-- safety_alerts
UPDATE safety_alerts SET company_id = companyid WHERE company_id IS NULL AND companyid IS NOT NULL;
UPDATE safety_alerts SET created_at = createdat WHERE created_at IS NULL AND createdat IS NOT NULL;

-- certifications
UPDATE certifications SET profile_id = profileid WHERE profile_id IS NULL AND profileid IS NOT NULL;
UPDATE certifications SET user_id = userid WHERE user_id IS NULL AND userid IS NOT NULL;
UPDATE certifications SET issued_at = issuedat WHERE issued_at IS NULL AND issuedat IS NOT NULL;
UPDATE certifications SET expires_at = expiresat WHERE expires_at IS NULL AND expiresat IS NOT NULL;

-- training
UPDATE training SET profile_id = profileid WHERE profile_id IS NULL AND profileid IS NOT NULL;
UPDATE training SET user_id = userid WHERE user_id IS NULL AND userid IS NOT NULL;
UPDATE training SET completed_at = completedat WHERE completed_at IS NULL AND completedat IS NOT NULL;

-- user_profile_data
UPDATE user_profile_data SET user_id = userid WHERE user_id IS NULL AND userid IS NOT NULL;
UPDATE user_profile_data SET date_of_birth = dateofbirth WHERE date_of_birth IS NULL AND dateofbirth IS NOT NULL;
UPDATE user_profile_data SET job_title = jobtitle WHERE job_title IS NULL AND jobtitle IS NOT NULL;
UPDATE user_profile_data SET emergency_contact_name = emergencycontactname WHERE emergency_contact_name IS NULL AND emergencycontactname IS NOT NULL;
UPDATE user_profile_data SET emergency_contact_phone = emergencycontactphone WHERE emergency_contact_phone IS NULL AND emergencycontactphone IS NOT NULL;
UPDATE user_profile_data SET national_insurance = nationalinsurance WHERE national_insurance IS NULL AND nationalinsurance IS NOT NULL;

-- assigned_operatives
UPDATE assigned_operatives SET site_id = siteid WHERE site_id IS NULL AND siteid IS NOT NULL;
UPDATE assigned_operatives SET user_id = userid WHERE user_id IS NULL AND userid IS NOT NULL;
UPDATE assigned_operatives SET assigned_at = assignedat WHERE assigned_at IS NULL AND assignedat IS NOT NULL;

-- settings
UPDATE settings SET company_id = companyid WHERE company_id IS NULL AND companyid IS NOT NULL;

-- -----------------------------------------------------------------------------
-- STEP 2: DROP DUPLICATE COLUMNS (and their FKs - dropped automatically)
-- -----------------------------------------------------------------------------

-- companies
ALTER TABLE companies DROP COLUMN IF EXISTS createdat;

-- users
ALTER TABLE users DROP COLUMN IF EXISTS companyid;
ALTER TABLE users DROP COLUMN IF EXISTS profileid;
ALTER TABLE users DROP COLUMN IF EXISTS createdat;

-- sites
ALTER TABLE sites DROP COLUMN IF EXISTS companyid;
ALTER TABLE sites DROP COLUMN IF EXISTS createdat;
ALTER TABLE sites DROP COLUMN IF EXISTS assignedusers;
ALTER TABLE sites DROP COLUMN IF EXISTS ramsversion;
ALTER TABLE sites DROP COLUMN IF EXISTS maincontractorid;

-- attendance
ALTER TABLE attendance DROP COLUMN IF EXISTS userid;
ALTER TABLE attendance DROP COLUMN IF EXISTS siteid;
ALTER TABLE attendance DROP COLUMN IF EXISTS companyid;

-- tasks
ALTER TABLE tasks DROP COLUMN IF EXISTS siteid;
ALTER TABLE tasks DROP COLUMN IF EXISTS companyid;
ALTER TABLE tasks DROP COLUMN IF EXISTS assignedto;
ALTER TABLE tasks DROP COLUMN IF EXISTS createdat;

-- notices
ALTER TABLE notices DROP COLUMN IF EXISTS siteid;
ALTER TABLE notices DROP COLUMN IF EXISTS companyid;
ALTER TABLE notices DROP COLUMN IF EXISTS createdat;

-- deliveries
ALTER TABLE deliveries DROP COLUMN IF EXISTS siteid;
ALTER TABLE deliveries DROP COLUMN IF EXISTS companyid;
ALTER TABLE deliveries DROP COLUMN IF EXISTS deliveredby;
ALTER TABLE deliveries DROP COLUMN IF EXISTS proofphotos;
ALTER TABLE deliveries DROP COLUMN IF EXISTS createdat;

-- rams
ALTER TABLE rams DROP COLUMN IF EXISTS siteid;
ALTER TABLE rams DROP COLUMN IF EXISTS companyid;
ALTER TABLE rams DROP COLUMN IF EXISTS fileurl;
ALTER TABLE rams DROP COLUMN IF EXISTS createdat;

-- briefings
ALTER TABLE briefings DROP COLUMN IF EXISTS companyid;
ALTER TABLE briefings DROP COLUMN IF EXISTS siteid;
ALTER TABLE briefings DROP COLUMN IF EXISTS createdat;

-- coshh
ALTER TABLE coshh DROP COLUMN IF EXISTS companyid;
ALTER TABLE coshh DROP COLUMN IF EXISTS createdat;

-- site_rules
ALTER TABLE site_rules DROP COLUMN IF EXISTS companyid;
ALTER TABLE site_rules DROP COLUMN IF EXISTS createdat;

-- safety_alerts
ALTER TABLE safety_alerts DROP COLUMN IF EXISTS companyid;
ALTER TABLE safety_alerts DROP COLUMN IF EXISTS createdat;

-- certifications
ALTER TABLE certifications DROP COLUMN IF EXISTS profileid;
ALTER TABLE certifications DROP COLUMN IF EXISTS userid;
ALTER TABLE certifications DROP COLUMN IF EXISTS issuedat;
ALTER TABLE certifications DROP COLUMN IF EXISTS expiresat;

-- training
ALTER TABLE training DROP COLUMN IF EXISTS profileid;
ALTER TABLE training DROP COLUMN IF EXISTS userid;
ALTER TABLE training DROP COLUMN IF EXISTS completedat;

-- user_profile_data
ALTER TABLE user_profile_data DROP COLUMN IF EXISTS userid;
ALTER TABLE user_profile_data DROP COLUMN IF EXISTS dateofbirth;
ALTER TABLE user_profile_data DROP COLUMN IF EXISTS jobtitle;
ALTER TABLE user_profile_data DROP COLUMN IF EXISTS emergencycontactname;
ALTER TABLE user_profile_data DROP COLUMN IF EXISTS emergencycontactphone;
ALTER TABLE user_profile_data DROP COLUMN IF EXISTS nationalinsurance;

-- assigned_operatives
ALTER TABLE assigned_operatives DROP COLUMN IF EXISTS siteid;
ALTER TABLE assigned_operatives DROP COLUMN IF EXISTS userid;
ALTER TABLE assigned_operatives DROP COLUMN IF EXISTS assignedat;

-- settings
ALTER TABLE settings DROP COLUMN IF EXISTS companyid;

-- -----------------------------------------------------------------------------
-- STEP 3: ADD MISSING FOREIGN KEYS
-- -----------------------------------------------------------------------------

-- briefing_acknowledgements: add FK to briefings (currently missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'briefing_acknowledgements_briefing_id_fkey'
      AND conrelid = 'briefing_acknowledgements'::regclass
  ) THEN
    ALTER TABLE briefing_acknowledgements
    ADD CONSTRAINT briefing_acknowledgements_briefing_id_fkey
    FOREIGN KEY (briefing_id) REFERENCES briefings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- STEP 4: ADD/RECREATE INDEXES ON CANONICAL COLUMNS
-- Drop legacy indexes (idx_*_companyId) and create canonical (company_id) if missing
-- -----------------------------------------------------------------------------

-- companies - ensure created_at index
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);

-- users
DROP INDEX IF EXISTS idx_users_companyId;
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id_created_at ON users(company_id, created_at);

-- sites
DROP INDEX IF EXISTS idx_sites_companyId;
CREATE INDEX IF NOT EXISTS idx_sites_company_id ON sites(company_id);
CREATE INDEX IF NOT EXISTS idx_sites_company_id_created_at ON sites(company_id, created_at);

-- attendance
DROP INDEX IF EXISTS idx_attendance_companyId;
DROP INDEX IF EXISTS idx_attendance_companyId_createdAt;
CREATE INDEX IF NOT EXISTS idx_attendance_company_id ON attendance(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_company_id_timestamp ON attendance(company_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_site_id_timestamp ON attendance(site_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id_timestamp ON attendance(user_id, timestamp);

-- tasks
DROP INDEX IF EXISTS idx_tasks_companyId;
DROP INDEX IF EXISTS idx_tasks_companyId_createdAt;
DROP INDEX IF EXISTS idx_tasks_siteId_createdAt;
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id_created_at ON tasks(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_site_id_created_at ON tasks(site_id, created_at);

-- notices
DROP INDEX IF EXISTS idx_notices_companyId;
DROP INDEX IF EXISTS idx_notices_companyId_createdAt;
DROP INDEX IF EXISTS idx_notices_siteId_createdAt;
CREATE INDEX IF NOT EXISTS idx_notices_company_id ON notices(company_id);
CREATE INDEX IF NOT EXISTS idx_notices_company_id_created_at ON notices(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notices_site_id_created_at ON notices(site_id, created_at);

-- deliveries
DROP INDEX IF EXISTS idx_deliveries_companyId;
DROP INDEX IF EXISTS idx_deliveries_companyId_createdAt;
DROP INDEX IF EXISTS idx_deliveries_siteId_createdAt;
CREATE INDEX IF NOT EXISTS idx_deliveries_company_id ON deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_company_id_created_at ON deliveries(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_site_id_created_at ON deliveries(site_id, created_at);

-- rams
DROP INDEX IF EXISTS idx_rams_companyId;
DROP INDEX IF EXISTS idx_rams_companyId_createdAt;
DROP INDEX IF EXISTS idx_rams_siteId_createdAt;
CREATE INDEX IF NOT EXISTS idx_rams_company_id ON rams(company_id);
CREATE INDEX IF NOT EXISTS idx_rams_company_id_created_at ON rams(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rams_site_id_created_at ON rams(site_id, created_at);

-- briefings
DROP INDEX IF EXISTS idx_briefings_companyId;
DROP INDEX IF EXISTS idx_briefings_companyId_createdAt;
CREATE INDEX IF NOT EXISTS idx_briefings_company_id ON briefings(company_id);
CREATE INDEX IF NOT EXISTS idx_briefings_company_id_created_at ON briefings(company_id, created_at);

-- coshh
DROP INDEX IF EXISTS idx_coshh_companyId;
DROP INDEX IF EXISTS idx_coshh_companyId_createdAt;
CREATE INDEX IF NOT EXISTS idx_coshh_company_id ON coshh(company_id);
CREATE INDEX IF NOT EXISTS idx_coshh_company_id_created_at ON coshh(company_id, created_at);

-- site_rules
DROP INDEX IF EXISTS idx_site_rules_companyId;
DROP INDEX IF EXISTS idx_site_rules_companyId_createdAt;
CREATE INDEX IF NOT EXISTS idx_site_rules_company_id ON site_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_site_rules_company_id_created_at ON site_rules(company_id, created_at);

-- safety_alerts
DROP INDEX IF EXISTS idx_safety_alerts_companyId;
DROP INDEX IF EXISTS idx_safety_alerts_companyId_createdAt;
CREATE INDEX IF NOT EXISTS idx_safety_alerts_company_id ON safety_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_company_id_created_at ON safety_alerts(company_id, created_at);

-- briefing_acknowledgements
CREATE INDEX IF NOT EXISTS idx_briefing_acknowledgements_user_briefing ON briefing_acknowledgements(user_id, briefing_id);

-- notices_read
CREATE INDEX IF NOT EXISTS idx_notices_read_user_notice ON notices_read(user_uid, notice_id);

-- -----------------------------------------------------------------------------
-- STEP 5: ADD NOT NULL WHERE APPROPRIATE (optional - run after validation)
-- Only uncomment after verifying no NULLs remain in these columns
-- -----------------------------------------------------------------------------

-- ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE attendance ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE attendance ALTER COLUMN site_id SET NOT NULL;
-- ALTER TABLE attendance ALTER COLUMN company_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- END PHASE 1
-- -----------------------------------------------------------------------------
