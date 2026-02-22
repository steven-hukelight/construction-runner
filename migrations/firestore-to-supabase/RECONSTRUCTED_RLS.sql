-- =============================================================================
-- FIRESTORE RECONSTRUCTION - RLS POLICIES
-- Equivalent to Firestore security rules (firestore.rules)
-- Assumes: auth.jwt() - role, companyId, superuser from Supabase Auth custom claims
-- =============================================================================

ALTER TABLE firestore_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE firestore_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE firestore_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE firestore_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE firestore_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE firestore_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE firestore_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE firestore_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE firestore_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE firestore_user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE firestore_pre_induction_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE firestore_pre_induction_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE firestore_profile_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE firestore_profile_training ENABLE ROW LEVEL SECURITY;

-- Helpers (use auth.uid() for current user, (auth.jwt()->>'companyId') for tenant)
CREATE OR REPLACE FUNCTION auth_is_superuser()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt()->>'superuser')::boolean = true OR (auth.jwt()->>'role') = 'superuser';
$$;

CREATE OR REPLACE FUNCTION auth_company_id()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT auth.jwt()->>'companyId';
$$;

-- Companies: superuser full access; own company (id = user's companyId) can read/update
CREATE POLICY companies_select ON firestore_companies FOR SELECT
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR id = auth_company_id()));
CREATE POLICY companies_update ON firestore_companies FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR id = auth_company_id()));
CREATE POLICY companies_insert ON firestore_companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth_is_superuser());
CREATE POLICY companies_delete ON firestore_companies FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth_is_superuser());

-- Users: tenant-scoped; self can read; superuser full
CREATE POLICY users_select ON firestore_users FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_company_id() OR
    id = (SELECT id FROM auth.users WHERE auth.users.id = auth.uid() LIMIT 1)::text OR
    uid = auth.uid()::text
  ));
CREATE POLICY users_insert ON firestore_users FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (auth_company_id() IS NOT NULL OR auth_is_superuser()));
CREATE POLICY users_update ON firestore_users FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY users_delete ON firestore_users FOR DELETE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_company_id()));

-- Sites: company or main contractor or linked subcontractor
CREATE POLICY sites_select ON firestore_sites FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_company_id() OR
    (SELECT company_id FROM firestore_users WHERE uid = auth.uid()::text LIMIT 1) = company_id
  ));
CREATE POLICY sites_insert ON firestore_sites FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_company_id()));
CREATE POLICY sites_update ON firestore_sites FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_company_id()));
CREATE POLICY sites_delete ON firestore_sites FOR DELETE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_company_id()));

-- Profiles: authenticated users (Firestore rule: isSuperuser() || request.auth.uid != null)
CREATE POLICY profiles_select ON firestore_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY profiles_insert ON firestore_profiles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY profiles_update ON firestore_profiles FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY profiles_delete ON firestore_profiles FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Tasks, Notices: company-scoped
CREATE POLICY tasks_all ON firestore_tasks FOR ALL
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_company_id()));

CREATE POLICY notices_all ON firestore_notices FOR ALL
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_company_id()));

-- Deliveries: company or site-assigned
CREATE POLICY deliveries_select ON firestore_deliveries FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_company_id() OR
    (SELECT company_id FROM firestore_users WHERE uid = auth.uid()::text LIMIT 1) = company_id
  ));
CREATE POLICY deliveries_insert ON firestore_deliveries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY deliveries_update ON firestore_deliveries FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_company_id()));
CREATE POLICY deliveries_delete ON firestore_deliveries FOR DELETE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_company_id()));

-- Settings: tenant-scoped
CREATE POLICY settings_all ON firestore_settings FOR ALL
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_company_id()));

-- Registrations: authenticated (backend approves)
CREATE POLICY registrations_all ON firestore_registrations FOR ALL
  USING (auth.uid() IS NOT NULL);

-- User profile: self (uid match) or company admin or superuser
CREATE POLICY user_profile_all ON firestore_user_profile FOR ALL
  USING (auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM firestore_users fu WHERE fu.id = firestore_user_profile.user_id AND fu.uid = auth.uid()::text) OR
    (SELECT company_id FROM firestore_users fu2 WHERE fu2.id = firestore_user_profile.user_id) = auth_company_id() OR
    auth_is_superuser()
  ));

CREATE POLICY pre_induction_personal_all ON firestore_pre_induction_personal FOR ALL
  USING (auth.uid() IS NOT NULL);
CREATE POLICY pre_induction_declarations_all ON firestore_pre_induction_declarations FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Profile certifications/training: via profile's user company
CREATE POLICY profile_certifications_all ON firestore_profile_certifications FOR ALL
  USING (auth.uid() IS NOT NULL);
CREATE POLICY profile_training_all ON firestore_profile_training FOR ALL
  USING (auth.uid() IS NOT NULL);
