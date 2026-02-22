-- =============================================================================
-- PHASE 2: FIREBASE → SUPABASE DATA MIGRATION (INSERT ONLY)
-- =============================================================================
-- DO NOT EXECUTE until:
--   1. Phase 1 schema cleanup is applied
--   2. Firebase data is exported to firebase_staging schema
-- No DELETE. No overwrite of existing Supabase data.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PREREQUISITE: Create firebase_staging schema and populate from Firebase export
-- Tables: companies, users, sites, attendance, tasks, notices, deliveries, rams,
--         briefings, coshh, safety_alerts, site_rules_docs, briefing_acks,
--         certifications, training, user_profile_data, assigned_operatives,
--         site_subcontractors, settings, pre_induction_personal, pre_induction_right_to_work,
--         pre_induction_certifications, pre_induction_medical, pre_induction_training,
--         pre_induction_declarations, user_site_inductions, notices_read,
--         medical_records, upload_logs
-- 
-- Firestore Timestamp conversion: store as ISO8601 text or epoch seconds
-- to_timestamp(epoch_seconds) or (value::text)::timestamptz for ISO
-- -----------------------------------------------------------------------------

-- Helper: Firestore timestamp to timestamptz (handles ISO string or epoch)
-- Use: fs_ts(field) in your staging table or convert during export

-- =============================================================================
-- ROOT COLLECTIONS - ON CONFLICT DO NOTHING (preserve existing)
-- =============================================================================

-- companies
INSERT INTO public.companies (id, name, created_at, updated_at)
SELECT
  firebase_id_to_uuid(f.id),
  f.name,
  COALESCE(
    CASE WHEN f.created_at ~ '^\d+$' THEN to_timestamp((f.created_at)::numeric) ELSE (f.created_at::text)::timestamptz END,
    NOW()
  ),
  NOW()
FROM firebase_staging.companies f
ON CONFLICT (id) DO NOTHING;

-- users
INSERT INTO public.users (id, email, company_id, role, profile_id, status, created_at, disabled, approved, superuser, firebase_uid, updated_at)
SELECT
  firebase_id_to_uuid(f.id),
  f.email,
  CASE WHEN f.company_id IS NOT NULL AND trim(f.company_id) != '' THEN firebase_id_to_uuid(f.company_id) ELSE NULL END,
  f.role,
  f.profile_id,
  f.status,
  COALESCE(
    CASE WHEN f.created_at ~ '^\d+$' THEN to_timestamp((f.created_at)::numeric) ELSE (f.created_at::text)::timestamptz END,
    NOW()
  ),
  f.disabled,
  f.approved,
  f.superuser,
  f.id,
  NOW()
FROM firebase_staging.users f
ON CONFLICT (id) DO NOTHING;

-- sites
INSERT INTO public.sites (id, company_id, name, created_at, assigned_users, rams_version, main_contractor_id, updated_at, location, geofence, latitude, longitude, radius_meters)
SELECT
  firebase_id_to_uuid(f.id),
  CASE WHEN f.company_id IS NOT NULL AND trim(f.company_id) != '' THEN firebase_id_to_uuid(f.company_id) ELSE NULL END,
  f.name,
  COALESCE(
    CASE WHEN f.created_at ~ '^\d+$' THEN to_timestamp((f.created_at)::numeric) ELSE (f.created_at::text)::timestamptz END,
    NOW()
  ),
  CASE WHEN f.assigned_users IS NOT NULL THEN f.assigned_users::jsonb ELSE NULL END,
  f.rams_version,
  f.main_contractor_id,
  NOW(),
  CASE WHEN f.location IS NOT NULL THEN f.location::jsonb ELSE NULL END,
  CASE WHEN f.geofence IS NOT NULL THEN f.geofence::jsonb ELSE NULL END,
  f.latitude,
  f.longitude,
  f.radius_meters
FROM firebase_staging.sites f
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CHILD TABLES - WHERE NOT EXISTS (never overwrite)
-- =============================================================================

-- attendance
INSERT INTO public.attendance (id, user_id, site_id, company_id, action, timestamp, latitude, longitude, accuracy, email, updated_at)
SELECT
  firebase_id_to_uuid(f.id),
  CASE WHEN f.user_id IS NOT NULL AND trim(f.user_id) != '' THEN firebase_id_to_uuid(f.user_id) ELSE NULL END,
  CASE WHEN f.site_id IS NOT NULL AND trim(f.site_id) != '' THEN firebase_id_to_uuid(f.site_id) ELSE NULL END,
  CASE WHEN f.company_id IS NOT NULL AND trim(f.company_id) != '' THEN firebase_id_to_uuid(f.company_id) ELSE NULL END,
  CASE
    WHEN f.action IN ('IN', 'OUT') THEN LOWER(f.action)
    WHEN f.action IN ('sign_in', 'sign_out') THEN f.action
    ELSE f.action
  END,
  COALESCE(
    CASE WHEN f.timestamp ~ '^\d+$' THEN to_timestamp((f.timestamp)::numeric) ELSE (f.timestamp::text)::timestamptz END,
    NOW()
  ),
  f.latitude,
  f.longitude,
  f.accuracy,
  f.email,
  NOW()
FROM firebase_staging.attendance f
WHERE NOT EXISTS (SELECT 1 FROM public.attendance a WHERE a.id = firebase_id_to_uuid(f.id));

-- tasks
INSERT INTO public.tasks (id, site_id, company_id, assigned_to, status, description, created_at, updated_at)
SELECT
  firebase_id_to_uuid(f.id),
  firebase_id_to_uuid(f.site_id),
  CASE WHEN f.company_id IS NOT NULL AND trim(f.company_id) != '' THEN firebase_id_to_uuid(f.company_id) ELSE NULL END,
  CASE WHEN f.assigned_to IS NOT NULL AND trim(f.assigned_to) != '' THEN firebase_id_to_uuid(f.assigned_to) ELSE NULL END,
  f.status,
  f.description,
  COALESCE(
    CASE WHEN f.created_at ~ '^\d+$' THEN to_timestamp((f.created_at)::numeric) ELSE (f.created_at::text)::timestamptz END,
    NOW()
  ),
  NOW()
FROM firebase_staging.tasks f
WHERE f.site_id IS NOT NULL AND trim(f.site_id) != ''
  AND NOT EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = firebase_id_to_uuid(f.id));

-- notices
INSERT INTO public.notices (id, site_id, company_id, title, body, attachments, created_at, updated_at)
SELECT
  firebase_id_to_uuid(f.id),
  firebase_id_to_uuid(f.site_id),
  CASE WHEN f.company_id IS NOT NULL AND trim(f.company_id) != '' THEN firebase_id_to_uuid(f.company_id) ELSE NULL END,
  f.title,
  f.body,
  CASE WHEN f.attachments IS NOT NULL THEN f.attachments::jsonb ELSE NULL END,
  COALESCE(
    CASE WHEN f.created_at ~ '^\d+$' THEN to_timestamp((f.created_at)::numeric) ELSE (f.created_at::text)::timestamptz END,
    NOW()
  ),
  NOW()
FROM firebase_staging.notices f
WHERE f.site_id IS NOT NULL AND trim(f.site_id) != ''
  AND NOT EXISTS (SELECT 1 FROM public.notices n WHERE n.id = firebase_id_to_uuid(f.id));

-- deliveries
INSERT INTO public.deliveries (id, site_id, company_id, delivered_by, proof_photos, created_at, updated_at, reference, status, scheduled_at, notes, pod_url, load_url, wholesaler, site)
SELECT
  firebase_id_to_uuid(f.id),
  firebase_id_to_uuid(f.site_id),
  firebase_id_to_uuid(f.company_id),
  CASE WHEN f.delivered_by IS NOT NULL AND trim(f.delivered_by) != '' THEN firebase_id_to_uuid(f.delivered_by) ELSE NULL END,
  CASE WHEN f.proof_photos IS NOT NULL THEN f.proof_photos::jsonb ELSE NULL END,
  COALESCE(
    CASE WHEN f.created_at ~ '^\d+$' THEN to_timestamp((f.created_at)::numeric) ELSE (f.created_at::text)::timestamptz END,
    NOW()
  ),
  NOW(),
  f.reference,
  f.status,
  CASE WHEN f.scheduled_at IS NOT NULL AND f.scheduled_at ~ '^\d+$' THEN to_timestamp((f.scheduled_at)::numeric)
       WHEN f.scheduled_at IS NOT NULL THEN (f.scheduled_at::text)::timestamptz ELSE NULL END,
  f.notes,
  f.pod_url,
  f.load_url,
  f.wholesaler,
  f.site
FROM firebase_staging.deliveries f
WHERE f.site_id IS NOT NULL AND trim(f.site_id) != ''
  AND NOT EXISTS (SELECT 1 FROM public.deliveries d WHERE d.id = firebase_id_to_uuid(f.id));

-- rams
INSERT INTO public.rams (id, site_id, company_id, type, file_url, version, created_at, updated_at, status, title, uploaded_by)
SELECT
  firebase_id_to_uuid(f.id),
  firebase_id_to_uuid(f.site_id),
  firebase_id_to_uuid(f.company_id),
  f.type,
  COALESCE(f.file_url, f.fileUrl),
  f.version,
  COALESCE(
    CASE WHEN f.created_at ~ '^\d+$' THEN to_timestamp((f.created_at)::numeric) ELSE (f.created_at::text)::timestamptz END,
    NOW()
  ),
  NOW(),
  f.status,
  f.title,
  CASE WHEN f.uploaded_by IS NOT NULL AND trim(f.uploaded_by) != '' THEN firebase_id_to_uuid(f.uploaded_by) ELSE NULL END
FROM firebase_staging.rams f
WHERE NOT EXISTS (SELECT 1 FROM public.rams r WHERE r.id = firebase_id_to_uuid(f.id));

-- briefings
INSERT INTO public.briefings (id, company_id, site_id, title, body, created_at, updated_at, file_url, uploaded_by)
SELECT
  firebase_id_to_uuid(f.id),
  CASE WHEN f.company_id IS NOT NULL AND trim(f.company_id) != '' THEN firebase_id_to_uuid(f.company_id) ELSE NULL END,
  firebase_id_to_uuid(f.site_id),
  f.title,
  f.body,
  COALESCE(
    CASE WHEN f.created_at ~ '^\d+$' THEN to_timestamp((f.created_at)::numeric) ELSE (f.created_at::text)::timestamptz END,
    NOW()
  ),
  NOW(),
  f.file_url,
  f.uploaded_by
FROM firebase_staging.briefings f
WHERE NOT EXISTS (SELECT 1 FROM public.briefings b WHERE b.id = firebase_id_to_uuid(f.id));

-- coshh
INSERT INTO public.coshh (id, company_id, site_id, title, body, created_at, updated_at, substance, hazard_symbols, ppe, file_url)
SELECT
  firebase_id_to_uuid(f.id),
  CASE WHEN f.company_id IS NOT NULL AND trim(f.company_id) != '' THEN firebase_id_to_uuid(f.company_id) ELSE NULL END,
  firebase_id_to_uuid(f.site_id),
  f.title,
  f.body,
  COALESCE(
    CASE WHEN f.created_at ~ '^\d+$' THEN to_timestamp((f.created_at)::numeric) ELSE (f.created_at::text)::timestamptz END,
    NOW()
  ),
  NOW(),
  f.substance,
  CASE WHEN f.hazard_symbols IS NOT NULL THEN f.hazard_symbols::jsonb ELSE NULL END,
  f.ppe,
  f.file_url
FROM firebase_staging.coshh f
WHERE NOT EXISTS (SELECT 1 FROM public.coshh c WHERE c.id = firebase_id_to_uuid(f.id));

-- safety_alerts
INSERT INTO public.safety_alerts (id, company_id, site_id, title, body, created_at, updated_at, description, severity, expires_at)
SELECT
  firebase_id_to_uuid(f.id),
  CASE WHEN f.company_id IS NOT NULL AND trim(f.company_id) != '' THEN firebase_id_to_uuid(f.company_id) ELSE NULL END,
  firebase_id_to_uuid(f.site_id),
  f.title,
  f.body,
  COALESCE(
    CASE WHEN f.created_at ~ '^\d+$' THEN to_timestamp((f.created_at)::numeric) ELSE (f.created_at::text)::timestamptz END,
    NOW()
  ),
  NOW(),
  f.description,
  f.severity,
  CASE WHEN f.expires_at IS NOT NULL AND f.expires_at ~ '^\d+$' THEN to_timestamp((f.expires_at)::numeric)
       WHEN f.expires_at IS NOT NULL THEN (f.expires_at::text)::timestamptz ELSE NULL END
FROM firebase_staging.safety_alerts f
WHERE NOT EXISTS (SELECT 1 FROM public.safety_alerts s WHERE s.id = firebase_id_to_uuid(f.id));

-- =============================================================================
-- SITE RULES - TRANSFORM: rules array → one row per rule
-- Firebase: siteRules/{companyId} doc with rules[] array
-- =============================================================================
INSERT INTO public.site_rules (id, company_id, site_id, title, body, category, created_at, updated_at)
SELECT
  gen_random_uuid(),
  firebase_id_to_uuid(f.company_id),
  CASE WHEN f.site_id IS NOT NULL AND trim(f.site_id) != '' THEN firebase_id_to_uuid(f.site_id) ELSE NULL END,
  r->>'title',
  r->>'body',
  r->>'category',
  NOW(),
  NOW()
FROM firebase_staging.site_rules_docs f,
     jsonb_array_elements(CASE WHEN f.rules IS NOT NULL AND jsonb_typeof(f.rules) = 'array' THEN f.rules ELSE '[]'::jsonb END) AS r
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_rules sr
  WHERE sr.company_id = firebase_id_to_uuid(f.company_id)
    AND sr.title IS NOT DISTINCT FROM r->>'title'
    AND sr.body IS NOT DISTINCT FROM r->>'body'
);

-- =============================================================================
-- ASSIGNED OPERATIVES - sites/{siteId}/assignedOperatives/{operativeId}
-- Generate uuid for id; path gives site_id and user_id
-- =============================================================================
INSERT INTO public.assigned_operatives (id, site_id, user_id, assigned_at, updated_at)
SELECT
  gen_random_uuid(),
  firebase_id_to_uuid(f.site_id),
  CASE WHEN f.user_id IS NOT NULL AND trim(f.user_id) != '' THEN firebase_id_to_uuid(f.user_id) ELSE NULL END,
  COALESCE(
    CASE WHEN f.assigned_at ~ '^\d+$' THEN to_timestamp((f.assigned_at)::numeric) ELSE (f.assigned_at::text)::timestamptz END,
    NOW()
  ),
  NOW()
FROM firebase_staging.assigned_operatives f
WHERE NOT EXISTS (
  SELECT 1 FROM public.assigned_operatives ao
  WHERE ao.site_id = firebase_id_to_uuid(f.site_id) AND ao.user_id = firebase_id_to_uuid(f.user_id)
);

-- =============================================================================
-- SITE SUBCONTRACTORS - sites/{siteId}/subcontractors/{companyId}
-- Composite PK (site_id, company_id)
-- =============================================================================
INSERT INTO public.site_subcontractors (site_id, company_id)
SELECT firebase_id_to_uuid(f.site_id), firebase_id_to_uuid(f.company_id)
FROM firebase_staging.site_subcontractors f
ON CONFLICT (site_id, company_id) DO NOTHING;

-- =============================================================================
-- BRIEFING ACKNOWLEDGEMENTS - users/{uid}/briefingAcknowledgements/{briefingId}
-- =============================================================================
INSERT INTO public.briefing_acknowledgements (id, user_id, briefing_id, acknowledged_at, signature_url)
SELECT
  gen_random_uuid(),
  firebase_id_to_uuid(f.user_id),
  firebase_id_to_uuid(f.briefing_id),
  COALESCE(
    CASE WHEN f.acknowledged_at ~ '^\d+$' THEN to_timestamp((f.acknowledged_at)::numeric) ELSE (f.acknowledged_at::text)::timestamptz END,
    NOW()
  ),
  f.signature_url
FROM firebase_staging.briefing_acks f
WHERE NOT EXISTS (
  SELECT 1 FROM public.briefing_acknowledgements ba
  WHERE ba.user_id = firebase_id_to_uuid(f.user_id) AND ba.briefing_id = firebase_id_to_uuid(f.briefing_id)
);

-- =============================================================================
-- CERTIFICATIONS - profiles/{profileId}/certifications/{docId} or users/{uid}/certifications
-- =============================================================================
INSERT INTO public.certifications (id, profile_id, user_id, type, issued_at, expires_at, updated_at, attachment_url, attachment_type)
SELECT
  firebase_id_to_uuid(f.id),
  CASE WHEN f.profile_id IS NOT NULL AND trim(f.profile_id) != '' THEN firebase_id_to_uuid(f.profile_id) ELSE NULL END,
  CASE WHEN f.user_id IS NOT NULL AND trim(f.user_id) != '' THEN firebase_id_to_uuid(f.user_id) ELSE NULL END,
  f.type,
  CASE WHEN f.issued_at ~ '^\d+$' THEN to_timestamp((f.issued_at)::numeric) ELSE (f.issued_at::text)::timestamptz END,
  CASE WHEN f.expires_at IS NOT NULL AND f.expires_at ~ '^\d+$' THEN to_timestamp((f.expires_at)::numeric)
       WHEN f.expires_at IS NOT NULL THEN (f.expires_at::text)::timestamptz ELSE NULL END,
  NOW(),
  f.attachment_url,
  f.attachment_type
FROM firebase_staging.certifications f
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TRAINING - profiles/{profileId}/training/{docId} or users/{uid}/training
-- =============================================================================
INSERT INTO public.training (id, profile_id, user_id, type, completed_at, updated_at, attachment_type, attachment_url)
SELECT
  firebase_id_to_uuid(f.id),
  CASE WHEN f.profile_id IS NOT NULL AND trim(f.profile_id) != '' THEN firebase_id_to_uuid(f.profile_id) ELSE NULL END,
  CASE WHEN f.user_id IS NOT NULL AND trim(f.user_id) != '' THEN firebase_id_to_uuid(f.user_id) ELSE NULL END,
  f.type,
  CASE WHEN f.completed_at ~ '^\d+$' THEN to_timestamp((f.completed_at)::numeric) ELSE (f.completed_at::text)::timestamptz END,
  NOW(),
  f.attachment_type,
  f.attachment_url
FROM firebase_staging.training f
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- USER PROFILE DATA - users/{uid}/profile/data
-- =============================================================================
INSERT INTO public.user_profile_data (id, user_id, address, town, postcode, date_of_birth, job_title, emergency_contact_name, emergency_contact_phone, national_insurance, utr, updated_at)
SELECT
  gen_random_uuid(),
  firebase_id_to_uuid(f.user_id),
  f.address,
  f.town,
  f.postcode,
  f.date_of_birth::date,
  f.job_title,
  f.emergency_contact_name,
  f.emergency_contact_phone,
  f.national_insurance,
  f.utr,
  NOW()
FROM firebase_staging.user_profile_data f
WHERE NOT EXISTS (SELECT 1 FROM public.user_profile_data upd WHERE upd.user_id = firebase_id_to_uuid(f.user_id));

-- =============================================================================
-- PRE-INDUCTION TABLES - users/{uid}/preInductionProfile/{section}
-- ON CONFLICT (user_id) DO NOTHING to preserve existing Supabase data
-- =============================================================================

-- pre_induction_personal
INSERT INTO public.pre_induction_personal (user_id, full_name, date_of_birth, phone, email, address, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, national_insurance, utr, updated_at)
SELECT
  firebase_id_to_uuid(f.user_id),
  f.full_name,
  f.date_of_birth::date,
  f.phone,
  f.email,
  f.address,
  f.emergency_contact_name,
  f.emergency_contact_relationship,
  f.emergency_contact_phone,
  f.national_insurance,
  f.utr,
  NOW()
FROM firebase_staging.pre_induction_personal f
ON CONFLICT (user_id) DO NOTHING;

-- pre_induction_right_to_work
INSERT INTO public.pre_induction_right_to_work (user_id, passport_url, passport_expiry, visa_url, visa_expiry, share_code, proof_of_address_url, right_to_work_verified, updated_at)
SELECT
  firebase_id_to_uuid(f.user_id),
  f.passport_url,
  f.passport_expiry::date,
  f.visa_url,
  f.visa_expiry::date,
  f.share_code,
  f.proof_of_address_url,
  f.right_to_work_verified,
  NOW()
FROM firebase_staging.pre_induction_right_to_work f
ON CONFLICT (user_id) DO NOTHING;

-- pre_induction_certifications
INSERT INTO public.pre_induction_certifications (user_id, certifications, updated_at)
SELECT
  firebase_id_to_uuid(f.user_id),
  f.certifications::jsonb,
  NOW()
FROM firebase_staging.pre_induction_certifications f
ON CONFLICT (user_id) DO NOTHING;

-- pre_induction_medical
INSERT INTO public.pre_induction_medical (user_id, medical_declaration, fit_to_work, allergies, medication, medical_certificate_url, medical_verified, updated_at)
SELECT
  firebase_id_to_uuid(f.user_id),
  f.medical_declaration,
  f.fit_to_work,
  f.allergies,
  f.medication,
  f.medical_certificate_url,
  f.medical_verified,
  NOW()
FROM firebase_staging.pre_induction_medical f
ON CONFLICT (user_id) DO NOTHING;

-- pre_induction_training
INSERT INTO public.pre_induction_training (user_id, rams_accepted, rams_accepted_at, rams_version, training_records, rams_required_version, rams_status, updated_at)
SELECT
  firebase_id_to_uuid(f.user_id),
  f.rams_accepted,
  CASE WHEN f.rams_accepted_at ~ '^\d+$' THEN to_timestamp((f.rams_accepted_at)::numeric) ELSE (f.rams_accepted_at::text)::timestamptz END,
  f.rams_version,
  f.training_records::jsonb,
  f.rams_required_version,
  f.rams_status,
  NOW()
FROM firebase_staging.pre_induction_training f
ON CONFLICT (user_id) DO NOTHING;

-- pre_induction_declarations
INSERT INTO public.pre_induction_declarations (user_id, operative_declaration_accepted, operative_declaration_accepted_at, updated_at)
SELECT
  firebase_id_to_uuid(f.user_id),
  f.operative_declaration_accepted,
  CASE WHEN f.operative_declaration_accepted_at ~ '^\d+$' THEN to_timestamp((f.operative_declaration_accepted_at)::numeric) ELSE (f.operative_declaration_accepted_at::text)::timestamptz END,
  NOW()
FROM firebase_staging.pre_induction_declarations f
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- USER SITE INDUCTIONS - users/{userId}/siteInductions/{siteId}
-- Composite PK (user_id, site_id)
-- =============================================================================
INSERT INTO public.user_site_inductions (user_id, site_id, status, completed_at, grandfathered)
SELECT
  firebase_id_to_uuid(f.user_id),
  firebase_id_to_uuid(f.site_id),
  f.status,
  CASE WHEN f.completed_at IS NOT NULL AND f.completed_at ~ '^\d+$' THEN to_timestamp((f.completed_at)::numeric)
       WHEN f.completed_at IS NOT NULL THEN (f.completed_at::text)::timestamptz ELSE NULL END,
  f.grandfathered
FROM firebase_staging.user_site_inductions f
ON CONFLICT (user_id, site_id) DO NOTHING;

-- =============================================================================
-- NOTICES READ - user_uid, notice_id, read_at
-- =============================================================================
INSERT INTO public.notices_read (id, user_uid, notice_id, read_at)
SELECT
  gen_random_uuid(),
  firebase_id_to_uuid(f.user_uid),
  firebase_id_to_uuid(f.notice_id),
  COALESCE(
    CASE WHEN f.read_at ~ '^\d+$' THEN to_timestamp((f.read_at)::numeric) ELSE (f.read_at::text)::timestamptz END,
    NOW()
  )
FROM firebase_staging.notices_read f
WHERE NOT EXISTS (
  SELECT 1 FROM public.notices_read nr
  WHERE nr.user_uid = firebase_id_to_uuid(f.user_uid) AND nr.notice_id = firebase_id_to_uuid(f.notice_id)
);

-- =============================================================================
-- SETTINGS - settings/global (company_id NULL), settings/{companyId}
-- =============================================================================
INSERT INTO public.settings (id, company_id, config, updated_at)
SELECT
  gen_random_uuid(),
  CASE WHEN f.company_id IS NOT NULL AND trim(f.company_id) != '' THEN firebase_id_to_uuid(f.company_id) ELSE NULL END,
  f.config::jsonb,
  NOW()
FROM firebase_staging.settings f
WHERE NOT EXISTS (
  SELECT 1 FROM public.settings s
  WHERE s.company_id IS NOT DISTINCT FROM CASE WHEN f.company_id IS NOT NULL AND trim(f.company_id) != '' THEN firebase_id_to_uuid(f.company_id) ELSE NULL END
);

-- =============================================================================
-- MEDICAL RECORDS & UPLOAD LOGS (if Firebase has these)
-- =============================================================================
-- Run once; duplicate records (same user_id + file_url) may occur if re-run
INSERT INTO public.medical_records (id, user_id, title, notes, file_name, file_url, storage_path, created_at, updated_at)
SELECT
  gen_random_uuid(),
  firebase_id_to_uuid(f.user_id),
  f.title,
  f.notes,
  f.file_name,
  f.file_url,
  f.storage_path,
  COALESCE(
    CASE WHEN f.created_at ~ '^\d+$' THEN to_timestamp((f.created_at)::numeric) ELSE (f.created_at::text)::timestamptz END,
    NOW()
  ),
  NOW()
FROM firebase_staging.medical_records f
WHERE f.user_id IS NOT NULL;

INSERT INTO public.upload_logs (id, user_id, path, created_at, extra)
SELECT
  gen_random_uuid(),
  CASE WHEN f.user_id IS NOT NULL AND trim(f.user_id) != '' THEN firebase_id_to_uuid(f.user_id) ELSE NULL END,
  f.path,
  COALESCE(
    CASE WHEN f.created_at ~ '^\d+$' THEN to_timestamp((f.created_at)::numeric) ELSE (f.created_at::text)::timestamptz END,
    NOW()
  ),
  f.extra::jsonb
FROM firebase_staging.upload_logs f;

-- -----------------------------------------------------------------------------
-- END PHASE 2
-- -----------------------------------------------------------------------------
