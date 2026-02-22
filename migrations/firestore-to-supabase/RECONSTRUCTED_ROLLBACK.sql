-- =============================================================================
-- FIRESTORE RECONSTRUCTION - ROLLBACK PLAN
-- Run this to remove all firestore_* tables and related objects.
-- Execute ONLY when you need to revert the reconstructed schema.
-- =============================================================================

-- Drop RLS policies first (they depend on tables)
DROP POLICY IF EXISTS companies_select ON firestore_companies;
DROP POLICY IF EXISTS companies_update ON firestore_companies;
DROP POLICY IF EXISTS companies_insert ON firestore_companies;
DROP POLICY IF EXISTS companies_delete ON firestore_companies;

DROP POLICY IF EXISTS users_select ON firestore_users;
DROP POLICY IF EXISTS users_insert ON firestore_users;
DROP POLICY IF EXISTS users_update ON firestore_users;
DROP POLICY IF EXISTS users_delete ON firestore_users;

DROP POLICY IF EXISTS sites_select ON firestore_sites;
DROP POLICY IF EXISTS sites_insert ON firestore_sites;
DROP POLICY IF EXISTS sites_update ON firestore_sites;
DROP POLICY IF EXISTS sites_delete ON firestore_sites;

DROP POLICY IF EXISTS profiles_select ON firestore_profiles;
DROP POLICY IF EXISTS profiles_insert ON firestore_profiles;
DROP POLICY IF EXISTS profiles_update ON firestore_profiles;
DROP POLICY IF EXISTS profiles_delete ON firestore_profiles;

DROP POLICY IF EXISTS tasks_all ON firestore_tasks;
DROP POLICY IF EXISTS notices_all ON firestore_notices;
DROP POLICY IF EXISTS deliveries_select ON firestore_deliveries;
DROP POLICY IF EXISTS deliveries_insert ON firestore_deliveries;
DROP POLICY IF EXISTS deliveries_update ON firestore_deliveries;
DROP POLICY IF EXISTS deliveries_delete ON firestore_deliveries;

DROP POLICY IF EXISTS settings_all ON firestore_settings;
DROP POLICY IF EXISTS registrations_all ON firestore_registrations;
DROP POLICY IF EXISTS user_profile_all ON firestore_user_profile;
DROP POLICY IF EXISTS pre_induction_personal_all ON firestore_pre_induction_personal;
DROP POLICY IF EXISTS pre_induction_declarations_all ON firestore_pre_induction_declarations;
DROP POLICY IF EXISTS profile_certifications_all ON firestore_profile_certifications;
DROP POLICY IF EXISTS profile_training_all ON firestore_profile_training;

-- Drop helper functions
DROP FUNCTION IF EXISTS auth_is_superuser();
DROP FUNCTION IF EXISTS auth_company_id();

-- Drop tables in reverse dependency order (children first)
DROP TABLE IF EXISTS firestore_profile_training;
DROP TABLE IF EXISTS firestore_profile_certifications;
DROP TABLE IF EXISTS firestore_pre_induction_declarations;
DROP TABLE IF EXISTS firestore_pre_induction_personal;
DROP TABLE IF EXISTS firestore_user_profile;
DROP TABLE IF EXISTS firestore_attendance;
DROP TABLE IF EXISTS firestore_rams;
DROP TABLE IF EXISTS firestore_briefings;

DROP TABLE IF EXISTS firestore_registrations;
DROP TABLE IF EXISTS firestore_settings;
DROP TABLE IF EXISTS firestore_deliveries;
DROP TABLE IF EXISTS firestore_notices;
DROP TABLE IF EXISTS firestore_tasks;

DROP TABLE IF EXISTS firestore_profiles;
DROP TABLE IF EXISTS firestore_sites;
DROP TABLE IF EXISTS firestore_users;
DROP TABLE IF EXISTS firestore_companies;

-- Verification (should return 0 rows)
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'firestore_%';
