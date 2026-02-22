-- =============================================================================
-- SITEHUB REBUILD - STEP 1: DROP ALL PUBLIC TABLES
-- =============================================================================
-- Drops all tables in public schema EXCEPT auth.users and Supabase internals.
-- Tables first (CASCADE drops policies), then functions.
-- =============================================================================

-- Drop tables first (CASCADE drops RLS policies that depend on auth_* functions)
DROP TABLE IF EXISTS briefing_acknowledgements CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS notices_read CASCADE;
DROP TABLE IF EXISTS user_profile_data CASCADE;
DROP TABLE IF EXISTS assigned_operatives CASCADE;
DROP TABLE IF EXISTS user_site_inductions CASCADE;
DROP TABLE IF EXISTS site_subcontractors CASCADE;
DROP TABLE IF EXISTS pre_induction_personal CASCADE;
DROP TABLE IF EXISTS pre_induction_right_to_work CASCADE;
DROP TABLE IF EXISTS pre_induction_certifications CASCADE;
DROP TABLE IF EXISTS pre_induction_medical CASCADE;
DROP TABLE IF EXISTS pre_induction_training CASCADE;
DROP TABLE IF EXISTS pre_induction_declarations CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS certifications CASCADE;
DROP TABLE IF EXISTS training CASCADE;
DROP TABLE IF EXISTS coshh CASCADE;
DROP TABLE IF EXISTS safety_alerts CASCADE;
DROP TABLE IF EXISTS site_rules CASCADE;
DROP TABLE IF EXISTS briefings CASCADE;
DROP TABLE IF EXISTS rams CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS upload_logs CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS user_pre_induction_profile CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS notices CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS profile_training CASCADE;
DROP TABLE IF EXISTS profile_certifications CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Drop any firestore_* tables from prior reconstruction
DROP TABLE IF EXISTS firestore_profile_training CASCADE;
DROP TABLE IF EXISTS firestore_profile_certifications CASCADE;
DROP TABLE IF EXISTS firestore_pre_induction_declarations CASCADE;
DROP TABLE IF EXISTS firestore_pre_induction_personal CASCADE;
DROP TABLE IF EXISTS firestore_user_profile CASCADE;
DROP TABLE IF EXISTS firestore_attendance CASCADE;
DROP TABLE IF EXISTS firestore_rams CASCADE;
DROP TABLE IF EXISTS firestore_briefings CASCADE;
DROP TABLE IF EXISTS firestore_registrations CASCADE;
DROP TABLE IF EXISTS firestore_settings CASCADE;
DROP TABLE IF EXISTS firestore_deliveries CASCADE;
DROP TABLE IF EXISTS firestore_notices CASCADE;
DROP TABLE IF EXISTS firestore_tasks CASCADE;
DROP TABLE IF EXISTS firestore_profiles CASCADE;
DROP TABLE IF EXISTS firestore_sites CASCADE;
DROP TABLE IF EXISTS firestore_users CASCADE;
DROP TABLE IF EXISTS firestore_companies CASCADE;

-- Drop RLS helper functions (after tables; policies already removed by CASCADE)
DROP FUNCTION IF EXISTS auth_user_role();
DROP FUNCTION IF EXISTS auth_user_company_id();
DROP FUNCTION IF EXISTS auth_is_superuser();
DROP FUNCTION IF EXISTS auth_is_admin_or_above();
