-- Construction Runner: Pre-induction storage bucket and policies
-- Path format: {user_id}/{sectionId}/{fieldName}_{filename}
-- Sections: rightToWork, competencyCard, medical, certifications, training, declarations
-- Access: own docs (path user_id = auth.uid) OR admin/supervisor for same-company user
--
-- NOTE: Uploads via API use service_role and bypass RLS. Policies apply to client-side access.
-- Bucket is public so stored getPublicUrl links work. For production with sensitive docs,
-- consider: public=false + API route that returns createSignedUrl() on demand.

-- =============================================================================
-- 1. CREATE BUCKET
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pre-induction',
  'pre-induction',
  false,  -- Private bucket; app uses signed URLs via /api/pre-induction/file
  10485760,  -- 10MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- 2. HELPER: can current user access pre-induction docs for target user?
-- =============================================================================

CREATE OR REPLACE FUNCTION public.pre_induction_storage_can_access(target_user_id_text text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      -- Own documents
      (auth.uid()::text = target_user_id_text)
      OR
      -- Admin/supervisor for same-company user (superuser can access any)
      (
        EXISTS (
          SELECT 1 FROM users me WHERE me.id = auth.uid()
          AND (me.role IN ('ADMIN', 'admin', 'SUPERVISOR', 'supervisor', 'SUPERUSER', 'superuser') OR me.superuser = true)
        )
        AND (
          -- Superuser: can access any
          auth_is_superuser()
          OR
          -- Same company as target user
          EXISTS (
            SELECT 1 FROM users target
            WHERE target.id::text = target_user_id_text
            AND target.company_id = auth_user_company_id()
          )
        )
      )
    );
$$;

-- =============================================================================
-- 3. STORAGE POLICIES
-- =============================================================================

-- UPLOAD: authenticated user can upload to own folder or for company user
DROP POLICY IF EXISTS "storage_pre_induction_upload" ON storage.objects;
CREATE POLICY "storage_pre_induction_upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'pre-induction'
    AND auth.role() = 'authenticated'
    AND public.pre_induction_storage_can_access((storage.foldername(name))[1])
  );

-- READ: same access rule
DROP POLICY IF EXISTS "storage_pre_induction_read" ON storage.objects;
CREATE POLICY "storage_pre_induction_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'pre-induction'
    AND auth.role() = 'authenticated'
    AND public.pre_induction_storage_can_access((storage.foldername(name))[1])
  );

-- DELETE: admin/supervisor only (not operatives deleting others' docs)
DROP POLICY IF EXISTS "storage_pre_induction_delete" ON storage.objects;
CREATE POLICY "storage_pre_induction_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'pre-induction'
    AND auth.role() = 'authenticated'
    AND public.pre_induction_storage_can_access((storage.foldername(name))[1])
    AND (
      -- Can delete own docs
      (auth.uid()::text = (storage.foldername(name))[1])
      OR
      -- Or admin/supervisor (not operatives)
      EXISTS (
        SELECT 1 FROM users u WHERE u.id = auth.uid()
        AND (u.role IN ('ADMIN', 'admin', 'SUPERVISOR', 'supervisor', 'SUPERUSER', 'superuser') OR u.superuser = true)
      )
    )
  );
