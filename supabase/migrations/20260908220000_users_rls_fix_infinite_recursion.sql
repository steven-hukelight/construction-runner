-- Fix: PostgrestException 42P17 "infinite recursion detected in policy for
-- relation \"users\"" on any query that touches public.users transitively.
--
-- Root cause: five legacy RLS policies on public.users each contained a
-- subquery of the form
--
--   EXISTS ( SELECT 1 FROM users u
--            WHERE u.id = auth.uid()
--              AND u.role = '<role>'
--              AND u.company_id = users.company_id )
--
-- This is a self-referential subquery against the same table the policy is
-- guarding. Postgres detects that evaluating the subquery would recursively
-- re-invoke every SELECT policy on `users` (including this one) and refuses
-- with 42P17. The error surfaces on the mobile app whenever any query
-- transitively joins users — e.g. the `user_profile_data` policies do
--
--   ( SELECT company_id FROM users WHERE id = user_profile_data.user_id )
--
-- which My Info hits on load. Result: "Could not load My Info." on iOS.
--
-- Fix: drop the five recursive policies. The remaining non-recursive
-- policies already provide correct behaviour by leaning on SECURITY DEFINER
-- helpers (`auth_is_admin_or_above()`, `auth_is_superuser()`,
-- `auth_user_company_id()`) which are STABLE / SET search_path=public, so
-- their internal `SELECT ... FROM users` runs under the definer's rights
-- and *bypasses* RLS — no recursion.
--
-- Remaining policies on public.users after this migration:
--   * user_read_self             (SELECT: id = auth.uid())
--   * user_no_update_role        (UPDATE: false)             -- deny direct role edits
--   * users_select_self_or_admin (SELECT: id = auth.uid() OR auth_is_admin_or_above())
--   * users_update_admin_only    (UPDATE: auth_is_admin_or_above())
--
-- Company-scoped visibility for cross-user reads (e.g. an operative reading
-- a coworker at the same company) is intentionally NOT re-added. Every
-- cross-user query in the app today already goes through the /api/* REST
-- layer which uses supabaseAdmin (service role → bypasses RLS) and applies
-- company scoping in SQL. Direct Supabase-client reads from mobile are
-- self-only (user_profile_data with user_id = auth.uid()) or scoped by the
-- caller's role via `auth_is_admin_or_above()`. Add a company-scoped policy
-- back only if a future feature requires operative-to-operative reads
-- directly from the client.

-- Idempotent DROPs — safe to re-run.
DROP POLICY IF EXISTS admin_company_rw_users        ON public.users;
DROP POLICY IF EXISTS operative_company_read_users  ON public.users;
DROP POLICY IF EXISTS supervisor_company_rw_users   ON public.users;
DROP POLICY IF EXISTS superuser_all_access          ON public.users;
DROP POLICY IF EXISTS superuser_all_access_users    ON public.users;

-- Sanity: RLS must still be enabled on public.users. This is a no-op if
-- it's already on.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
