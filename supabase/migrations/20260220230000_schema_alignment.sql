-- SiteHub Schema Alignment
-- Aligns migrations with live production database
-- Idempotent: CREATE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, DROP IF EXISTS before CREATE POLICY

-- =============================================================================
-- 1. TABLES IN LIVE DB BUT NOT IN MIGRATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS notices_read (
  notice_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (notice_id, user_id)
);
ALTER TABLE notices_read ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS upload_logs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE upload_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. TABLES IN MIGRATIONS BUT MISSING IN LIVE DB
-- =============================================================================

CREATE TABLE IF NOT EXISTS near_miss (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  site_id TEXT,
  operative_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_near_miss_company_id ON near_miss(company_id);
CREATE INDEX IF NOT EXISTS idx_near_miss_reviewed ON near_miss(company_id) WHERE reviewed_at IS NULL;
ALTER TABLE near_miss ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_offline_queue_user_id ON offline_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_company_id ON offline_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_synced_at ON offline_queue(synced_at) WHERE synced_at IS NULL;
ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset_id ON asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_user_id ON asset_assignments(user_id);
ALTER TABLE asset_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS asset_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asset_inspections_asset_id ON asset_inspections(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_inspections_user_id ON asset_inspections(user_id);
ALTER TABLE asset_inspections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS asset_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asset_documents_asset_id ON asset_documents(asset_id);
ALTER TABLE asset_documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  site_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_message_threads_company_id ON message_threads(company_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_created_by ON message_threads(created_by);
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS messages_thread (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_thread_thread_id ON messages_thread(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_created_at ON messages_thread(created_at DESC);
ALTER TABLE messages_thread ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_recipients_thread_user ON message_recipients(thread_id, user_id);
CREATE INDEX IF NOT EXISTS idx_message_recipients_user_id ON message_recipients(user_id);
ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. MISSING COLUMNS (ADD to existing tables)
-- =============================================================================

ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;
ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS national_insurance TEXT;
ALTER TABLE pre_induction_personal ADD COLUMN IF NOT EXISTS utr TEXT;

ALTER TABLE pre_induction_right_to_work ADD COLUMN IF NOT EXISTS passport_url TEXT;
ALTER TABLE pre_induction_right_to_work ADD COLUMN IF NOT EXISTS passport_expiry TIMESTAMPTZ;
ALTER TABLE pre_induction_right_to_work ADD COLUMN IF NOT EXISTS visa_url TEXT;
ALTER TABLE pre_induction_right_to_work ADD COLUMN IF NOT EXISTS visa_expiry TIMESTAMPTZ;
ALTER TABLE pre_induction_right_to_work ADD COLUMN IF NOT EXISTS share_code TEXT;
ALTER TABLE pre_induction_right_to_work ADD COLUMN IF NOT EXISTS proof_of_address_url TEXT;
ALTER TABLE pre_induction_right_to_work ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE pre_induction_right_to_work ADD COLUMN IF NOT EXISTS right_to_work_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE pre_induction_certifications ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]';

ALTER TABLE pre_induction_medical ADD COLUMN IF NOT EXISTS medical_declaration TEXT;
ALTER TABLE pre_induction_medical ADD COLUMN IF NOT EXISTS fit_to_work BOOLEAN;
ALTER TABLE pre_induction_medical ADD COLUMN IF NOT EXISTS medical_certificate_url TEXT;
ALTER TABLE pre_induction_medical ADD COLUMN IF NOT EXISTS medical_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE pre_induction_training ADD COLUMN IF NOT EXISTS training_records JSONB DEFAULT '[]';

ALTER TABLE pre_induction_declarations ADD COLUMN IF NOT EXISTS operative_declaration_accepted BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE notices ADD COLUMN IF NOT EXISTS site_id TEXT;  -- TEXT to match sites.id (varies by deployment)
ALTER TABLE notices ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE notices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE rams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
ALTER TABLE rams ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE rams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS accuracy NUMERIC;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivered_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS proof_photos JSONB DEFAULT '[]';
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE assigned_operatives ADD COLUMN IF NOT EXISTS userid UUID;
ALTER TABLE assigned_operatives ADD COLUMN IF NOT EXISTS assignedat TIMESTAMPTZ;

ALTER TABLE user_site_inductions ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE user_site_inductions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_site_inductions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE settings ADD COLUMN IF NOT EXISTS companyId TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS display JSONB;

ALTER TABLE profile_training ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- =============================================================================
-- 4. TYPE CORRECTIONS (standardise issue_date, expiry_date to DATE)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profile_training' AND column_name = 'issue_date' AND data_type != 'date') THEN
    ALTER TABLE profile_training ALTER COLUMN issue_date TYPE DATE USING issue_date::date;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profile_training' AND column_name = 'expiry_date' AND data_type != 'date') THEN
    ALTER TABLE profile_training ALTER COLUMN expiry_date TYPE DATE USING expiry_date::date;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profile_certifications' AND column_name = 'issue_date' AND data_type != 'date') THEN
    ALTER TABLE profile_certifications ALTER COLUMN issue_date TYPE DATE USING issue_date::date;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profile_certifications' AND column_name = 'expiry_date' AND data_type != 'date') THEN
    ALTER TABLE profile_certifications ALTER COLUMN expiry_date TYPE DATE USING expiry_date::date;
  END IF;
END $$;

-- =============================================================================
-- 5. HELPER FUNCTIONS FOR RLS (idempotent)
-- =============================================================================

CREATE OR REPLACE FUNCTION auth_user_company_id()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT u.company_id FROM users u WHERE u.id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION auth_is_superuser()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT u.superuser = true FROM users u WHERE u.id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION auth_is_admin_or_above()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid()
    AND u.role IN ('ADMIN', 'admin', 'SUPERVISOR', 'supervisor', 'SUPERUSER', 'superuser')
  ) OR auth_is_superuser();
$$;

-- =============================================================================
-- 6. RLS POLICIES (tables with RLS enabled but no policies)
-- =============================================================================

-- messages (company_id)
DROP POLICY IF EXISTS superuser_all_access_messages ON messages;
CREATE POLICY superuser_all_access_messages ON messages FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_messages ON messages;
CREATE POLICY admin_company_rw_messages ON messages FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_messages ON messages;
CREATE POLICY supervisor_company_rw_messages ON messages FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_messages ON messages;
CREATE POLICY operative_company_read_messages ON messages FOR SELECT
  USING (auth.uid() IS NOT NULL AND company_id = auth_user_company_id());

-- assets (company_id)
DROP POLICY IF EXISTS superuser_all_access_assets ON assets;
CREATE POLICY superuser_all_access_assets ON assets FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_assets ON assets;
CREATE POLICY admin_company_rw_assets ON assets FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_assets ON assets;
CREATE POLICY supervisor_company_rw_assets ON assets FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_assets ON assets;
CREATE POLICY operative_company_read_assets ON assets FOR SELECT
  USING (auth.uid() IS NOT NULL AND company_id = auth_user_company_id());

-- offline_sync_log (company_id)
DROP POLICY IF EXISTS superuser_all_access_offline_sync_log ON offline_sync_log;
CREATE POLICY superuser_all_access_offline_sync_log ON offline_sync_log FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_offline_sync_log ON offline_sync_log;
CREATE POLICY admin_company_rw_offline_sync_log ON offline_sync_log FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_offline_sync_log ON offline_sync_log;
CREATE POLICY supervisor_company_rw_offline_sync_log ON offline_sync_log FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_offline_sync_log ON offline_sync_log;
CREATE POLICY operative_company_read_offline_sync_log ON offline_sync_log FOR SELECT
  USING (auth.uid() IS NOT NULL AND company_id = auth_user_company_id());

-- user_profile_data (via user -> company)
DROP POLICY IF EXISTS superuser_all_access_user_profile_data ON user_profile_data;
CREATE POLICY superuser_all_access_user_profile_data ON user_profile_data FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_user_profile_data ON user_profile_data;
CREATE POLICY admin_company_rw_user_profile_data ON user_profile_data FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id FROM users WHERE id = user_profile_data.user_id) = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_user_profile_data ON user_profile_data;
CREATE POLICY supervisor_company_rw_user_profile_data ON user_profile_data FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id FROM users WHERE id = user_profile_data.user_id) = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_user_profile_data ON user_profile_data;
CREATE POLICY operative_company_read_user_profile_data ON user_profile_data FOR SELECT
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR userid = auth.uid()));

-- briefings (company_id)
DROP POLICY IF EXISTS superuser_all_access_briefings ON briefings;
CREATE POLICY superuser_all_access_briefings ON briefings FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_briefings ON briefings;
CREATE POLICY admin_company_rw_briefings ON briefings FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_briefings ON briefings;
CREATE POLICY supervisor_company_rw_briefings ON briefings FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_briefings ON briefings;
CREATE POLICY operative_company_read_briefings ON briefings FOR SELECT
  USING (auth.uid() IS NOT NULL AND company_id = auth_user_company_id());

-- site_subcontractors (company_id)
DROP POLICY IF EXISTS superuser_all_access_site_subcontractors ON site_subcontractors;
CREATE POLICY superuser_all_access_site_subcontractors ON site_subcontractors FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_site_subcontractors ON site_subcontractors;
CREATE POLICY admin_company_rw_site_subcontractors ON site_subcontractors FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_site_subcontractors ON site_subcontractors;
CREATE POLICY supervisor_company_rw_site_subcontractors ON site_subcontractors FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_site_subcontractors ON site_subcontractors;
CREATE POLICY operative_company_read_site_subcontractors ON site_subcontractors FOR SELECT
  USING (auth.uid() IS NOT NULL AND company_id = auth_user_company_id());

-- briefing_acknowledgements (via briefing -> company)
DROP POLICY IF EXISTS superuser_all_access_briefing_acknowledgements ON briefing_acknowledgements;
CREATE POLICY superuser_all_access_briefing_acknowledgements ON briefing_acknowledgements FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_briefing_acknowledgements ON briefing_acknowledgements;
CREATE POLICY admin_company_rw_briefing_acknowledgements ON briefing_acknowledgements FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id FROM briefings WHERE id = briefing_acknowledgements.briefing_id) = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_briefing_acknowledgements ON briefing_acknowledgements;
CREATE POLICY supervisor_company_rw_briefing_acknowledgements ON briefing_acknowledgements FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id FROM briefings WHERE id = briefing_acknowledgements.briefing_id) = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_briefing_acknowledgements ON briefing_acknowledgements;
CREATE POLICY operative_company_read_briefing_acknowledgements ON briefing_acknowledgements FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- safety_alerts (company_id)
DROP POLICY IF EXISTS superuser_all_access_safety_alerts ON safety_alerts;
CREATE POLICY superuser_all_access_safety_alerts ON safety_alerts FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_safety_alerts ON safety_alerts;
CREATE POLICY admin_company_rw_safety_alerts ON safety_alerts FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_safety_alerts ON safety_alerts;
CREATE POLICY supervisor_company_rw_safety_alerts ON safety_alerts FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_safety_alerts ON safety_alerts;
CREATE POLICY operative_company_read_safety_alerts ON safety_alerts FOR SELECT
  USING (auth.uid() IS NOT NULL AND company_id = auth_user_company_id());

-- assigned_operatives (via site -> company)
DROP POLICY IF EXISTS superuser_all_access_assigned_operatives ON assigned_operatives;
CREATE POLICY superuser_all_access_assigned_operatives ON assigned_operatives FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_assigned_operatives ON assigned_operatives;
CREATE POLICY admin_company_rw_assigned_operatives ON assigned_operatives FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id::text FROM sites WHERE id::text = assigned_operatives.site_id) = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_assigned_operatives ON assigned_operatives;
CREATE POLICY supervisor_company_rw_assigned_operatives ON assigned_operatives FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id::text FROM sites WHERE id::text = assigned_operatives.site_id) = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_assigned_operatives ON assigned_operatives;
CREATE POLICY operative_company_read_assigned_operatives ON assigned_operatives FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- user_site_inductions (via site -> company)
DROP POLICY IF EXISTS superuser_all_access_user_site_inductions ON user_site_inductions;
CREATE POLICY superuser_all_access_user_site_inductions ON user_site_inductions FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_user_site_inductions ON user_site_inductions;
CREATE POLICY admin_company_rw_user_site_inductions ON user_site_inductions FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id::text FROM sites WHERE id::text = user_site_inductions.site_id) = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_user_site_inductions ON user_site_inductions;
CREATE POLICY supervisor_company_rw_user_site_inductions ON user_site_inductions FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id::text FROM sites WHERE id::text = user_site_inductions.site_id) = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_user_site_inductions ON user_site_inductions;
CREATE POLICY operative_company_read_user_site_inductions ON user_site_inductions FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- coshh (company_id)
DROP POLICY IF EXISTS superuser_all_access_coshh ON coshh;
CREATE POLICY superuser_all_access_coshh ON coshh FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_coshh ON coshh;
CREATE POLICY admin_company_rw_coshh ON coshh FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_coshh ON coshh;
CREATE POLICY supervisor_company_rw_coshh ON coshh FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_coshh ON coshh;
CREATE POLICY operative_company_read_coshh ON coshh FOR SELECT
  USING (auth.uid() IS NOT NULL AND company_id = auth_user_company_id());

-- task_assignments (via task -> company)
DROP POLICY IF EXISTS superuser_all_access_task_assignments ON task_assignments;
CREATE POLICY superuser_all_access_task_assignments ON task_assignments FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_task_assignments ON task_assignments;
CREATE POLICY admin_company_rw_task_assignments ON task_assignments FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id FROM tasks WHERE id = task_assignments.task_id) = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_task_assignments ON task_assignments;
CREATE POLICY supervisor_company_rw_task_assignments ON task_assignments FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id FROM tasks WHERE id = task_assignments.task_id) = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_task_assignments ON task_assignments;
CREATE POLICY operative_company_read_task_assignments ON task_assignments FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- audit_logs (user_id, service_role mostly)
DROP POLICY IF EXISTS superuser_all_access_audit_logs ON audit_logs;
CREATE POLICY superuser_all_access_audit_logs ON audit_logs FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_audit_logs ON audit_logs;
CREATE POLICY admin_company_rw_audit_logs ON audit_logs FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above());

DROP POLICY IF EXISTS supervisor_company_rw_audit_logs ON audit_logs;
CREATE POLICY supervisor_company_rw_audit_logs ON audit_logs FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above());

DROP POLICY IF EXISTS operative_company_read_audit_logs ON audit_logs;
CREATE POLICY operative_company_read_audit_logs ON audit_logs FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id IS NOT NULL AND user_id::text = auth.uid()::text);

-- site_rules (company_id)
DROP POLICY IF EXISTS superuser_all_access_site_rules ON site_rules;
CREATE POLICY superuser_all_access_site_rules ON site_rules FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_site_rules ON site_rules;
CREATE POLICY admin_company_rw_site_rules ON site_rules FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_site_rules ON site_rules;
CREATE POLICY supervisor_company_rw_site_rules ON site_rules FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_site_rules ON site_rules;
CREATE POLICY operative_company_read_site_rules ON site_rules FOR SELECT
  USING (auth.uid() IS NOT NULL AND company_id = auth_user_company_id());

-- certifications (via user -> company)
DROP POLICY IF EXISTS superuser_all_access_certifications ON certifications;
CREATE POLICY superuser_all_access_certifications ON certifications FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_certifications ON certifications;
CREATE POLICY admin_company_rw_certifications ON certifications FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id FROM users WHERE id = certifications.user_id) = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_certifications ON certifications;
CREATE POLICY supervisor_company_rw_certifications ON certifications FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id FROM users WHERE id = certifications.user_id) = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_certifications ON certifications;
CREATE POLICY operative_company_read_certifications ON certifications FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- medical_records (via user -> company)
DROP POLICY IF EXISTS superuser_all_access_medical_records ON medical_records;
CREATE POLICY superuser_all_access_medical_records ON medical_records FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_medical_records ON medical_records;
CREATE POLICY admin_company_rw_medical_records ON medical_records FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id FROM users WHERE id = medical_records.user_id) = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_medical_records ON medical_records;
CREATE POLICY supervisor_company_rw_medical_records ON medical_records FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id FROM users WHERE id = medical_records.user_id) = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_medical_records ON medical_records;
CREATE POLICY operative_company_read_medical_records ON medical_records FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- notices_read (via notice -> company)
DROP POLICY IF EXISTS superuser_all_access_notices_read ON notices_read;
CREATE POLICY superuser_all_access_notices_read ON notices_read FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_notices_read ON notices_read;
CREATE POLICY admin_company_rw_notices_read ON notices_read FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id FROM notices WHERE id::text = notices_read.notice_id) = auth_user_company_id());

DROP POLICY IF EXISTS supervisor_company_rw_notices_read ON notices_read;
CREATE POLICY supervisor_company_rw_notices_read ON notices_read FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
    AND (SELECT company_id FROM notices WHERE id::text = notices_read.notice_id) = auth_user_company_id());

DROP POLICY IF EXISTS operative_company_read_notices_read ON notices_read;
CREATE POLICY operative_company_read_notices_read ON notices_read FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- upload_logs (service_role + self for user_id)
DROP POLICY IF EXISTS superuser_all_access_upload_logs ON upload_logs;
CREATE POLICY superuser_all_access_upload_logs ON upload_logs FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());

DROP POLICY IF EXISTS admin_company_rw_upload_logs ON upload_logs;
CREATE POLICY admin_company_rw_upload_logs ON upload_logs FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above());

DROP POLICY IF EXISTS supervisor_company_rw_upload_logs ON upload_logs;
CREATE POLICY supervisor_company_rw_upload_logs ON upload_logs FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above());

DROP POLICY IF EXISTS operative_company_read_upload_logs ON upload_logs;
CREATE POLICY operative_company_read_upload_logs ON upload_logs FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
