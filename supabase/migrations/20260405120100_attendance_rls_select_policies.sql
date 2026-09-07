-- Allow scoped SELECT on attendance for authenticated JWT roles (Table Editor, any direct
-- PostgREST client). service_role continues to bypass RLS for Next.js API routes.
-- Operatives: own rows only. Superusers: all rows. Admins/supervisors: company + legacy null/blank.

DROP POLICY IF EXISTS attendance_select_authenticated ON public.attendance;

CREATE POLICY attendance_select_authenticated
  ON public.attendance
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth_is_superuser()
    OR lower(trim(coalesce((SELECT role FROM public.users u WHERE u.id = auth.uid()), ''))) = 'superuser'
    OR (
      auth_is_admin_or_above()
      AND NOT (lower(trim(coalesce((SELECT role FROM public.users u WHERE u.id = auth.uid()), ''))) = 'superuser')
      AND NOT COALESCE((SELECT u.superuser FROM public.users u WHERE u.id = auth.uid() LIMIT 1), false)
      AND (
        company_id IS NULL
        OR btrim(coalesce(company_id, '')) = ''
        OR company_id = auth_user_company_id()
      )
    )
  );

-- No INSERT/UPDATE/DELETE for JWT: attendance writes stay API/service_role + SECURITY DEFINER.
