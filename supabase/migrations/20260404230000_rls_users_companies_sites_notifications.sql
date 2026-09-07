-- Replace initial_schema placeholder policies (SELECT USING (true)) on core tenant tables.
-- Secure public.notifications queue. Uses existing helpers: auth_user_company_id(),
-- auth_is_admin_or_above(), auth_is_superuser() (defined in earlier migrations).
-- service_role bypasses RLS; no policies needed for backend/cron writes.

-- ── users ───────────────────────────────────────────────────────────────────
-- Only drop legacy placeholder here; avoid DROP IF EXISTS on new policy names (PostgreSQL
-- emits NOTICE when the object does not exist on first apply).
DROP POLICY IF EXISTS "placeholder" ON public.users;

CREATE POLICY "users_select_self_or_admin"
  ON public.users
  FOR SELECT
  USING (
    id = auth.uid()
    OR auth_is_admin_or_above()
  );

CREATE POLICY "users_update_admin_only"
  ON public.users
  FOR UPDATE
  USING (auth_is_admin_or_above())
  WITH CHECK (auth_is_admin_or_above());

-- ── companies ─────────────────────────────────────────────────────────────────
-- users.company_id is TEXT; companies.id is UUID — compare as text.
DROP POLICY IF EXISTS "placeholder" ON public.companies;

CREATE POLICY "companies_select_by_user_company_or_admin"
  ON public.companies
  FOR SELECT
  USING (
    id::text = auth_user_company_id()
    OR auth_is_admin_or_above()
  );

-- ── sites ───────────────────────────────────────────────────────────────────
-- sites.company_id may be UUID or TEXT depending on migration history; cast for comparison.
DROP POLICY IF EXISTS "placeholder" ON public.sites;

CREATE POLICY "sites_select_by_company_or_admin"
  ON public.sites
  FOR SELECT
  USING (
    company_id::text = auth_user_company_id()
    OR auth_is_admin_or_above()
  );

-- ── notifications (attendance auto sign-out queue, etc.) ─────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own_or_admin"
  ON public.notifications
  FOR SELECT
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR auth_is_admin_or_above()
  );
