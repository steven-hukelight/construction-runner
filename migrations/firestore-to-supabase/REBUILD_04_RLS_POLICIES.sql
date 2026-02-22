-- =============================================================================
-- SITEHUB REBUILD - STEP 4: RLS POLICIES
-- =============================================================================
-- Role model: superuser → full | admin → company | supervisor → site | operative → self
-- Uses: auth.uid() = users.id, profiles.user_id::uuid = users.id, users.company_id = row.company_id
-- =============================================================================

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(u.role, 'operative') FROM users u WHERE u.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_user_company_id()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.company_id FROM users u WHERE u.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_is_superuser()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.superuser = true FROM users u WHERE u.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_is_admin_or_above()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('ADMIN', 'admin', 'SUPERVISOR', 'supervisor', 'SUPERUSER', 'superuser')
  ) OR auth_is_superuser();
$$;

-- COMPANIES
CREATE POLICY companies_select ON companies FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    id = auth_user_company_id()
  ));
CREATE POLICY companies_update ON companies FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR id = auth_user_company_id()));
CREATE POLICY companies_insert ON companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth_is_superuser());
CREATE POLICY companies_delete ON companies FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth_is_superuser());

-- USERS
CREATE POLICY users_select ON users FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_user_company_id() OR
    id = auth.uid()
  ));
CREATE POLICY users_insert ON users FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY users_update ON users FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_user_company_id() OR
    id = auth.uid()
  ));
CREATE POLICY users_delete ON users FOR DELETE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));

-- SITES
CREATE POLICY sites_select ON sites FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_user_company_id()
  ));
CREATE POLICY sites_insert ON sites FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));
CREATE POLICY sites_update ON sites FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));
CREATE POLICY sites_delete ON sites FOR DELETE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));

-- PROFILES (join via profiles.user_id = users.id)
CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    user_id = auth.uid() OR
    (SELECT company_id FROM users WHERE users.id = user_id) = auth_user_company_id()
  ));
CREATE POLICY profiles_insert ON profiles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    user_id = auth.uid() OR
    (SELECT company_id FROM users u WHERE u.id = profiles.user_id) = auth_user_company_id()
  ));
CREATE POLICY profiles_delete ON profiles FOR DELETE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    user_id = auth.uid() OR
    (SELECT company_id FROM users u WHERE u.id = profiles.user_id) = auth_user_company_id()
  ));

-- PROFILE_CERTIFICATIONS (via profile's user)
CREATE POLICY profile_certifications_select ON profile_certifications FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    (SELECT user_id FROM profiles p WHERE p.id = profile_certifications.profile_id) = auth.uid() OR
    (SELECT company_id FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.id = profile_certifications.profile_id) = auth_user_company_id()
  ));
CREATE POLICY profile_certifications_insert ON profile_certifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY profile_certifications_update ON profile_certifications FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    (SELECT user_id FROM profiles p WHERE p.id = profile_certifications.profile_id) = auth.uid() OR
    (SELECT company_id FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.id = profile_certifications.profile_id) = auth_user_company_id()
  ));
CREATE POLICY profile_certifications_delete ON profile_certifications FOR DELETE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    (SELECT user_id FROM profiles p WHERE p.id = profile_certifications.profile_id) = auth.uid() OR
    (SELECT company_id FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.id = profile_certifications.profile_id) = auth_user_company_id()
  ));

-- PROFILE_TRAINING
CREATE POLICY profile_training_select ON profile_training FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    (SELECT user_id FROM profiles p WHERE p.id = profile_training.profile_id) = auth.uid() OR
    (SELECT company_id FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.id = profile_training.profile_id) = auth_user_company_id()
  ));
CREATE POLICY profile_training_insert ON profile_training FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY profile_training_update ON profile_training FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    (SELECT user_id FROM profiles p WHERE p.id = profile_training.profile_id) = auth.uid() OR
    (SELECT company_id FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.id = profile_training.profile_id) = auth_user_company_id()
  ));
CREATE POLICY profile_training_delete ON profile_training FOR DELETE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    (SELECT user_id FROM profiles p WHERE p.id = profile_training.profile_id) = auth.uid() OR
    (SELECT company_id FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.id = profile_training.profile_id) = auth_user_company_id()
  ));

-- DELIVERIES
CREATE POLICY deliveries_select ON deliveries FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_user_company_id() OR
    created_by = auth.uid()
  ));
CREATE POLICY deliveries_insert ON deliveries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY deliveries_update ON deliveries FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_user_company_id() OR
    created_by = auth.uid()
  ));
CREATE POLICY deliveries_delete ON deliveries FOR DELETE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_user_company_id() OR
    created_by = auth.uid()
  ));

-- NOTICES
CREATE POLICY notices_select ON notices FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_user_company_id()
  ));
CREATE POLICY notices_insert ON notices FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));
CREATE POLICY notices_update ON notices FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));
CREATE POLICY notices_delete ON notices FOR DELETE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));

-- NOTICES_READ
CREATE POLICY notices_read_select ON notices_read FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    user_id = auth.uid() OR
    (SELECT company_id FROM notices n WHERE n.id = notices_read.notice_id) = auth_user_company_id()
  ));
CREATE POLICY notices_read_insert ON notices_read FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY notices_read_update ON notices_read FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY notices_read_delete ON notices_read FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- TASKS
CREATE POLICY tasks_select ON tasks FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_user_company_id()
  ));
CREATE POLICY tasks_insert ON tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));
CREATE POLICY tasks_update ON tasks FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));
CREATE POLICY tasks_delete ON tasks FOR DELETE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));

-- SETTINGS
CREATE POLICY settings_select ON settings FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_user_company_id()
  ));
CREATE POLICY settings_insert ON settings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY settings_update ON settings FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));
CREATE POLICY settings_delete ON settings FOR DELETE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));

-- REGISTRATIONS (authenticated)
CREATE POLICY registrations_select ON registrations FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY registrations_insert ON registrations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY registrations_update ON registrations FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY registrations_delete ON registrations FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- USER_PRE_INDUCTION_PROFILE
CREATE POLICY user_pre_induction_profile_select ON user_pre_induction_profile FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    user_id = auth.uid() OR
    (SELECT company_id FROM users u WHERE u.id = user_pre_induction_profile.user_id) = auth_user_company_id()
  ));
CREATE POLICY user_pre_induction_profile_insert ON user_pre_induction_profile FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY user_pre_induction_profile_update ON user_pre_induction_profile FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    user_id = auth.uid() OR
    (SELECT company_id FROM users u WHERE u.id = user_pre_induction_profile.user_id) = auth_user_company_id()
  ));
CREATE POLICY user_pre_induction_profile_delete ON user_pre_induction_profile FOR DELETE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    user_id = auth.uid() OR
    (SELECT company_id FROM users u WHERE u.id = user_pre_induction_profile.user_id) = auth_user_company_id()
  ));

-- ATTENDANCE
CREATE POLICY attendance_select ON attendance FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_user_company_id() OR
    user_id = auth.uid()
  ));
CREATE POLICY attendance_insert ON attendance FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY attendance_update ON attendance FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_user_company_id() OR
    user_id = auth.uid()
  ));
CREATE POLICY attendance_delete ON attendance FOR DELETE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_user_company_id() OR
    user_id = auth.uid()
  ));

-- RAMS
CREATE POLICY rams_select ON rams FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    company_id = auth_user_company_id()
  ));
CREATE POLICY rams_insert ON rams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));
CREATE POLICY rams_update ON rams FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));
CREATE POLICY rams_delete ON rams FOR DELETE
  USING (auth.uid() IS NOT NULL AND (auth_is_superuser() OR company_id = auth_user_company_id()));

-- UPLOAD_LOGS
CREATE POLICY upload_logs_select ON upload_logs FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    user_id = auth.uid() OR
    (SELECT company_id FROM users u WHERE u.id = upload_logs.user_id) = auth_user_company_id()
  ));
CREATE POLICY upload_logs_insert ON upload_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY upload_logs_update ON upload_logs FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    user_id = auth.uid() OR
    (SELECT company_id FROM users u WHERE u.id = upload_logs.user_id) = auth_user_company_id()
  ));
CREATE POLICY upload_logs_delete ON upload_logs FOR DELETE
  USING (auth.uid() IS NOT NULL AND (
    auth_is_superuser() OR
    user_id = auth.uid() OR
    (SELECT company_id FROM users u WHERE u.id = upload_logs.user_id) = auth_user_company_id()
  ));
