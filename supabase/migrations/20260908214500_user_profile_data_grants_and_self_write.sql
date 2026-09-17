-- My Info failed on iOS with: permission denied for table user_profile_data
--
-- RLS policies existed, but the authenticated role had no table GRANTs
-- (only postgres + service_role). PostgREST therefore never reached RLS and
-- returned 42501. Pre-induction tables already had authenticated grants.
--
-- Also add a self INSERT/UPDATE policy so operatives can save emergency
-- contact on their own row (existing write policies were admin/supervisor only).

GRANT SELECT, INSERT, UPDATE ON TABLE public.user_profile_data TO authenticated;

DROP POLICY IF EXISTS user_profile_data_self_write ON public.user_profile_data;
CREATE POLICY user_profile_data_self_write
  ON public.user_profile_data
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      user_id = auth.uid()
      OR (userid IS NOT NULL AND userid = auth.uid())
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      user_id = auth.uid()
      OR (userid IS NOT NULL AND userid = auth.uid())
    )
  );
