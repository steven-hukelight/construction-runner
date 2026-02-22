// supabase/auth/trigger/sync_claims.sql
-- Trigger to sync JWT custom claims from users table (for RLS)
-- This is a template: adjust for your Supabase project

-- Example: On update to users, update auth.users app_metadata (if using Supabase Auth v2+)
-- See: https://supabase.com/docs/guides/auth/managing-user-attributes

-- This is a placeholder. Actual implementation may require Supabase Admin API or external function.

-- CREATE OR REPLACE FUNCTION sync_claims_to_auth_users() RETURNS trigger AS $$
-- BEGIN
--   -- Example: update app_metadata for user
--   -- Not implemented: Supabase restricts direct writes to auth.users
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER trigger_sync_claims
-- AFTER UPDATE ON users
-- FOR EACH ROW EXECUTE FUNCTION sync_claims_to_auth_users();
