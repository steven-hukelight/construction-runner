-- My Info save failed with:
--   PostgrestException: permission denied for table users (42501)
--
-- Saving emergency contact writes user_profile_data. Postgres then evaluates
-- admin/supervisor FOR ALL policies that do
--   SELECT company_id FROM users WHERE id = user_profile_data.user_id
-- as the invoker (authenticated). That role had no table GRANT on users, so
-- policy evaluation aborted before user_profile_data_self_write could allow
-- the row. This was not caused by removing local app files.
--
-- Fix:
--   1) GRANT SELECT on users to authenticated. RLS on users still limits rows
--      (self, or admin via existing policies).
--   2) Replace the invoker subquery with a SECURITY DEFINER helper so
--      user_profile_data admin/supervisor policies never depend on the
--      invoker's GRANT or users RLS.

GRANT SELECT ON TABLE public.users TO authenticated;

CREATE OR REPLACE FUNCTION public.user_company_id(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.company_id FROM public.users u WHERE u.id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.user_company_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_company_id(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS admin_company_rw_user_profile_data ON public.user_profile_data;
CREATE POLICY admin_company_rw_user_profile_data
  ON public.user_profile_data
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth_is_admin_or_above()
    AND public.user_company_id(user_id) = auth_user_company_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth_is_admin_or_above()
    AND public.user_company_id(user_id) = auth_user_company_id()
  );

DROP POLICY IF EXISTS supervisor_company_rw_user_profile_data ON public.user_profile_data;
CREATE POLICY supervisor_company_rw_user_profile_data
  ON public.user_profile_data
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth_is_admin_or_above()
    AND public.user_company_id(user_id) = auth_user_company_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth_is_admin_or_above()
    AND public.user_company_id(user_id) = auth_user_company_id()
  );
