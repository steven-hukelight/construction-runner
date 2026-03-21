-- Construction Runner: Storage buckets, storage policies, and deliveries.scheduled_at
-- Run after 20260220250000_security_cleanup_and_modules.sql
-- Idempotent: INSERT ON CONFLICT / DROP IF EXISTS + CREATE

-- =============================================================================
-- 1. DELIVERIES: scheduled_at column
-- =============================================================================

ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- =============================================================================
-- 2. STORAGE BUCKETS
-- =============================================================================

-- Create buckets if not exist (Supabase storage)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('asset_photos', 'asset_photos', false),
  ('asset_documents', 'asset_documents', false),
  ('delivery_pod', 'delivery_pod', false),
  ('delivery_load_photos', 'delivery_load_photos', false),
  ('message_attachments', 'message_attachments', false),
  ('rams_documents', 'rams_documents', false),
  ('profile_photos', 'profile_photos', false),
  ('company_documents', 'company_documents', false)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. STORAGE POLICIES (path format: {company_id}/...)
-- Uses auth_user_company_id() for company scoping (from public schema)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.storage_company_folder()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT auth_user_company_id(); $$;

-- Helper: allow authenticated users in same company (first path segment = company_id)
DO $$
DECLARE
  b text;
  buckets text[] := ARRAY['asset_photos','asset_documents','delivery_pod','delivery_load_photos','message_attachments','rams_documents','profile_photos','company_documents'];
BEGIN
  FOREACH b IN ARRAY buckets
  LOOP
    -- UPLOAD
    EXECUTE format(
      'DROP POLICY IF EXISTS "storage_%s_upload" ON storage.objects',
      b
    );
    EXECUTE format(
      'CREATE POLICY "storage_%s_upload" ON storage.objects FOR INSERT
        WITH CHECK (
          bucket_id = %L
          AND auth.role() = ''authenticated''
          AND (storage.foldername(name))[1] = public.storage_company_folder()
        )',
      b, b
    );

    -- READ
    EXECUTE format(
      'DROP POLICY IF EXISTS "storage_%s_read" ON storage.objects',
      b
    );
    EXECUTE format(
      'CREATE POLICY "storage_%s_read" ON storage.objects FOR SELECT
        USING (
          bucket_id = %L
          AND auth.role() = ''authenticated''
          AND (storage.foldername(name))[1] = public.storage_company_folder()
        )',
      b, b
    );

    -- DELETE (admins + supervisors only)
    EXECUTE format(
      'DROP POLICY IF EXISTS "storage_%s_delete" ON storage.objects',
      b
    );
    EXECUTE format(
      'CREATE POLICY "storage_%s_delete" ON storage.objects FOR DELETE
        USING (
          bucket_id = %L
          AND auth.role() = ''authenticated''
          AND (storage.foldername(name))[1] = public.storage_company_folder()
          AND EXISTS (
            SELECT 1 FROM public.users u WHERE u.id = auth.uid()
            AND (u.role IN (''admin'', ''ADMIN'', ''supervisor'', ''SUPERVISOR'', ''superuser'', ''SUPERUSER'') OR u.superuser = true)
          )
        )',
      b, b
    );
  END LOOP;
END $$;
