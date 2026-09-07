-- Fix company_haulage RLS policies (idempotent; migration 20260306100000 was partially applied)
DROP POLICY IF EXISTS superuser_all_access_company_haulage ON company_haulage;
CREATE POLICY superuser_all_access_company_haulage ON company_haulage FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_company_haulage ON company_haulage;
CREATE POLICY admin_company_rw_company_haulage ON company_haulage FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_company_haulage ON company_haulage;
CREATE POLICY operative_company_read_company_haulage ON company_haulage FOR SELECT
  USING (auth.uid() IS NOT NULL AND company_id = auth_user_company_id());
