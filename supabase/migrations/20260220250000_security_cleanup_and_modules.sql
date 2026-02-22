-- SiteHub: Security Hardening, Schema Cleanup, and Module Foundations
-- Run after 20260220240000_schema_canonical_baseline.sql
-- Idempotent: DROP IF EXISTS, CREATE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS

-- =============================================================================
-- 0. HELPER FUNCTIONS (required for RLS - create if missing)
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
-- 1. LEGACY TABLE REMOVAL (not required for Assets, Deliveries, Messaging, RAMS)
-- =============================================================================

DROP TABLE IF EXISTS near_miss CASCADE;
DROP TABLE IF EXISTS offline_queue CASCADE;

-- =============================================================================
-- 2. MODULE COLUMNS (add any still missing)
-- =============================================================================

-- Deliveries
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivered_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS proof_photos JSONB DEFAULT '[]';
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- RAMS
ALTER TABLE rams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
ALTER TABLE rams ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE rams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Messages (optional thread_id for threaded use - no FK to avoid cross-migration deps)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID;

-- =============================================================================
-- 3. MODULE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_deliveries_site_id ON deliveries(site_id);
CREATE INDEX IF NOT EXISTS idx_rams_site_id ON rams(site_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id) WHERE thread_id IS NOT NULL;

-- =============================================================================
-- 4. RLS POLICIES: Section 1 tables (ensure all 4 policies exist)
-- =============================================================================

-- messages
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

-- assets
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

-- offline_sync_log
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

-- user_profile_data
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
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR (userid IS NOT NULL AND userid::text = auth.uid()::text)));

-- briefings
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

-- briefing_acknowledgements
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

-- safety_alerts
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

-- assigned_operatives
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

-- user_site_inductions
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

-- certifications
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

-- medical_records
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

-- audit_logs (user_id may be TEXT - use text comparison)
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

-- task_assignments
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

-- site_rules
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

-- coshh
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

-- =============================================================================
-- 5. MODULE RLS: asset_assignments, asset_inspections, asset_documents
-- =============================================================================

-- asset_assignments (scope via asset -> company_id)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'asset_assignments') THEN
    DROP POLICY IF EXISTS superuser_all_access_asset_assignments ON asset_assignments;
    CREATE POLICY superuser_all_access_asset_assignments ON asset_assignments FOR ALL
      USING (auth.role() = 'service_role' OR auth_is_superuser());
    DROP POLICY IF EXISTS admin_company_rw_asset_assignments ON asset_assignments;
    CREATE POLICY admin_company_rw_asset_assignments ON asset_assignments FOR ALL
      USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
        AND (SELECT company_id FROM assets WHERE id = asset_assignments.asset_id) = auth_user_company_id());
    DROP POLICY IF EXISTS supervisor_company_rw_asset_assignments ON asset_assignments;
    CREATE POLICY supervisor_company_rw_asset_assignments ON asset_assignments FOR ALL
      USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
        AND (SELECT company_id FROM assets WHERE id = asset_assignments.asset_id) = auth_user_company_id());
    DROP POLICY IF EXISTS operative_company_read_asset_assignments ON asset_assignments;
    CREATE POLICY operative_company_read_asset_assignments ON asset_assignments FOR SELECT
      USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
  END IF;
END $$;

-- asset_inspections
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'asset_inspections') THEN
    DROP POLICY IF EXISTS superuser_all_access_asset_inspections ON asset_inspections;
    CREATE POLICY superuser_all_access_asset_inspections ON asset_inspections FOR ALL
      USING (auth.role() = 'service_role' OR auth_is_superuser());
    DROP POLICY IF EXISTS admin_company_rw_asset_inspections ON asset_inspections;
    CREATE POLICY admin_company_rw_asset_inspections ON asset_inspections FOR ALL
      USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
        AND (SELECT company_id FROM assets WHERE id = asset_inspections.asset_id) = auth_user_company_id());
    DROP POLICY IF EXISTS supervisor_company_rw_asset_inspections ON asset_inspections;
    CREATE POLICY supervisor_company_rw_asset_inspections ON asset_inspections FOR ALL
      USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
        AND (SELECT company_id FROM assets WHERE id = asset_inspections.asset_id) = auth_user_company_id());
    DROP POLICY IF EXISTS operative_company_read_asset_inspections ON asset_inspections;
    CREATE POLICY operative_company_read_asset_inspections ON asset_inspections FOR SELECT
      USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
  END IF;
END $$;

-- asset_documents
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'asset_documents') THEN
    DROP POLICY IF EXISTS superuser_all_access_asset_documents ON asset_documents;
    CREATE POLICY superuser_all_access_asset_documents ON asset_documents FOR ALL
      USING (auth.role() = 'service_role' OR auth_is_superuser());
    DROP POLICY IF EXISTS admin_company_rw_asset_documents ON asset_documents;
    CREATE POLICY admin_company_rw_asset_documents ON asset_documents FOR ALL
      USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
        AND (SELECT company_id FROM assets WHERE id = asset_documents.asset_id) = auth_user_company_id());
    DROP POLICY IF EXISTS supervisor_company_rw_asset_documents ON asset_documents;
    CREATE POLICY supervisor_company_rw_asset_documents ON asset_documents FOR ALL
      USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
        AND (SELECT company_id FROM assets WHERE id = asset_documents.asset_id) = auth_user_company_id());
    DROP POLICY IF EXISTS operative_company_read_asset_documents ON asset_documents;
    CREATE POLICY operative_company_read_asset_documents ON asset_documents FOR SELECT
      USING (auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM assets a WHERE a.id = asset_documents.asset_id AND a.company_id = auth_user_company_id()));
  END IF;
END $$;

-- =============================================================================
-- 6. MODULE RLS: message_threads, messages_thread, message_recipients
-- =============================================================================

-- message_threads
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'message_threads') THEN
    DROP POLICY IF EXISTS superuser_all_access_message_threads ON message_threads;
    CREATE POLICY superuser_all_access_message_threads ON message_threads FOR ALL
      USING (auth.role() = 'service_role' OR auth_is_superuser());
    DROP POLICY IF EXISTS admin_company_rw_message_threads ON message_threads;
    CREATE POLICY admin_company_rw_message_threads ON message_threads FOR ALL
      USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());
    DROP POLICY IF EXISTS supervisor_company_rw_message_threads ON message_threads;
    CREATE POLICY supervisor_company_rw_message_threads ON message_threads FOR ALL
      USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());
    DROP POLICY IF EXISTS operative_company_read_message_threads ON message_threads;
    CREATE POLICY operative_company_read_message_threads ON message_threads FOR SELECT
      USING (auth.uid() IS NOT NULL AND company_id = auth_user_company_id());
  END IF;
END $$;

-- messages_thread
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages_thread') THEN
    DROP POLICY IF EXISTS superuser_all_access_messages_thread ON messages_thread;
    CREATE POLICY superuser_all_access_messages_thread ON messages_thread FOR ALL
      USING (auth.role() = 'service_role' OR auth_is_superuser());
    DROP POLICY IF EXISTS admin_company_rw_messages_thread ON messages_thread;
    CREATE POLICY admin_company_rw_messages_thread ON messages_thread FOR ALL
      USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
        AND (SELECT company_id FROM message_threads WHERE id = messages_thread.thread_id) = auth_user_company_id());
    DROP POLICY IF EXISTS supervisor_company_rw_messages_thread ON messages_thread;
    CREATE POLICY supervisor_company_rw_messages_thread ON messages_thread FOR ALL
      USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
        AND (SELECT company_id FROM message_threads WHERE id = messages_thread.thread_id) = auth_user_company_id());
    DROP POLICY IF EXISTS operative_company_read_messages_thread ON messages_thread;
    CREATE POLICY operative_company_read_messages_thread ON messages_thread FOR SELECT
      USING (auth.uid() IS NOT NULL
        AND (SELECT company_id FROM message_threads WHERE id = messages_thread.thread_id) = auth_user_company_id());
  END IF;
END $$;

-- message_recipients
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'message_recipients') THEN
    DROP POLICY IF EXISTS superuser_all_access_message_recipients ON message_recipients;
    CREATE POLICY superuser_all_access_message_recipients ON message_recipients FOR ALL
      USING (auth.role() = 'service_role' OR auth_is_superuser());
    DROP POLICY IF EXISTS admin_company_rw_message_recipients ON message_recipients;
    CREATE POLICY admin_company_rw_message_recipients ON message_recipients FOR ALL
      USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
        AND (SELECT company_id FROM message_threads WHERE id = message_recipients.thread_id) = auth_user_company_id());
    DROP POLICY IF EXISTS supervisor_company_rw_message_recipients ON message_recipients;
    CREATE POLICY supervisor_company_rw_message_recipients ON message_recipients FOR ALL
      USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above()
        AND (SELECT company_id FROM message_threads WHERE id = message_recipients.thread_id) = auth_user_company_id());
    DROP POLICY IF EXISTS operative_company_read_message_recipients ON message_recipients;
    CREATE POLICY operative_company_read_message_recipients ON message_recipients FOR SELECT
      USING (auth.uid() IS NOT NULL
        AND (SELECT company_id FROM message_threads WHERE id = message_recipients.thread_id) = auth_user_company_id());
  END IF;
END $$;

-- =============================================================================
-- 7. MODULE RLS: deliveries, rams
-- =============================================================================

-- deliveries
DROP POLICY IF EXISTS superuser_all_access_deliveries ON deliveries;
CREATE POLICY superuser_all_access_deliveries ON deliveries FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());
DROP POLICY IF EXISTS admin_company_rw_deliveries ON deliveries;
CREATE POLICY admin_company_rw_deliveries ON deliveries FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());
DROP POLICY IF EXISTS supervisor_company_rw_deliveries ON deliveries;
CREATE POLICY supervisor_company_rw_deliveries ON deliveries FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());
DROP POLICY IF EXISTS operative_company_read_deliveries ON deliveries;
CREATE POLICY operative_company_read_deliveries ON deliveries FOR SELECT
  USING (auth.uid() IS NOT NULL AND company_id = auth_user_company_id());

-- rams
DROP POLICY IF EXISTS superuser_all_access_rams ON rams;
CREATE POLICY superuser_all_access_rams ON rams FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superuser());
DROP POLICY IF EXISTS admin_company_rw_rams ON rams;
CREATE POLICY admin_company_rw_rams ON rams FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());
DROP POLICY IF EXISTS supervisor_company_rw_rams ON rams;
CREATE POLICY supervisor_company_rw_rams ON rams FOR ALL
  USING (auth.uid() IS NOT NULL AND auth_is_admin_or_above() AND company_id = auth_user_company_id());
DROP POLICY IF EXISTS operative_company_read_rams ON rams;
CREATE POLICY operative_company_read_rams ON rams FOR SELECT
  USING (auth.uid() IS NOT NULL AND company_id = auth_user_company_id());
