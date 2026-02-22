-- =============================================================================
-- FIREBASE STAGING SCHEMA
-- =============================================================================
-- Create this schema and populate from Firebase export before running PHASE2.
-- All text columns accept Firestore values; timestamps as ISO8601 or epoch seconds.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS firebase_staging;

-- Root collections (id = document ID from Firebase)
CREATE TABLE firebase_staging.companies (
  id text PRIMARY KEY,
  name text,
  created_at text
);

CREATE TABLE firebase_staging.users (
  id text PRIMARY KEY,
  email text,
  company_id text,
  role text,
  profile_id text,
  status text,
  created_at text,
  disabled boolean,
  approved boolean,
  superuser boolean
);

CREATE TABLE firebase_staging.sites (
  id text PRIMARY KEY,
  company_id text,
  name text,
  created_at text,
  assigned_users text,  -- JSON array as text → cast to jsonb
  rams_version text,
  main_contractor_id text,
  location text,
  geofence text,
  latitude numeric,
  longitude numeric,
  radius_meters numeric
);

CREATE TABLE firebase_staging.attendance (
  id text PRIMARY KEY,
  user_id text,
  site_id text,
  company_id text,
  action text,
  timestamp text,
  latitude numeric,
  longitude numeric,
  accuracy numeric,
  email text
);

CREATE TABLE firebase_staging.tasks (
  id text PRIMARY KEY,
  site_id text,
  company_id text,
  assigned_to text,
  status text,
  description text,
  created_at text
);

CREATE TABLE firebase_staging.notices (
  id text PRIMARY KEY,
  site_id text,
  company_id text,
  title text,
  body text,
  attachments text,
  created_at text
);

CREATE TABLE firebase_staging.deliveries (
  id text PRIMARY KEY,
  site_id text,
  company_id text,
  delivered_by text,
  proof_photos text,
  created_at text,
  reference text,
  status text,
  scheduled_at text,
  notes text,
  pod_url text,
  load_url text,
  wholesaler text,
  site text
);

CREATE TABLE firebase_staging.rams (
  id text PRIMARY KEY,
  site_id text,
  company_id text,
  type text,
  file_url text,
  fileUrl text,  -- alternate field name
  version text,
  created_at text,
  status text,
  title text,
  uploaded_by text
);

CREATE TABLE firebase_staging.briefings (
  id text PRIMARY KEY,
  company_id text,
  site_id text,
  title text,
  body text,
  created_at text,
  file_url text,
  uploaded_by text
);

CREATE TABLE firebase_staging.coshh (
  id text PRIMARY KEY,
  company_id text,
  site_id text,
  title text,
  body text,
  created_at text,
  substance text,
  hazard_symbols text,
  ppe text,
  file_url text
);

CREATE TABLE firebase_staging.safety_alerts (
  id text PRIMARY KEY,
  company_id text,
  site_id text,
  title text,
  body text,
  created_at text,
  description text,
  severity text,
  expires_at text
);

-- siteRules: one doc per company with rules[] array
CREATE TABLE firebase_staging.site_rules_docs (
  company_id text PRIMARY KEY,
  site_id text,
  rules jsonb  -- array of {title, body, category}
);

-- assignedOperatives subcollection
CREATE TABLE firebase_staging.assigned_operatives (
  site_id text,
  user_id text,
  assigned_at text,
  PRIMARY KEY (site_id, user_id)
);

-- subcontractors subcollection
CREATE TABLE firebase_staging.site_subcontractors (
  site_id text,
  company_id text,
  linked_at text,
  PRIMARY KEY (site_id, company_id)
);

-- briefing acknowledgements
CREATE TABLE firebase_staging.briefing_acks (
  user_id text,
  briefing_id text,
  acknowledged_at text,
  signature_url text,
  PRIMARY KEY (user_id, briefing_id)
);

-- certifications & training
CREATE TABLE firebase_staging.certifications (
  id text PRIMARY KEY,
  profile_id text,
  user_id text,
  type text,
  issued_at text,
  expires_at text,
  attachment_url text,
  attachment_type text
);

CREATE TABLE firebase_staging.training (
  id text PRIMARY KEY,
  profile_id text,
  user_id text,
  type text,
  completed_at text,
  attachment_type text,
  attachment_url text
);

-- user profile data
CREATE TABLE firebase_staging.user_profile_data (
  user_id text PRIMARY KEY,
  address text,
  town text,
  postcode text,
  date_of_birth text,
  job_title text,
  emergency_contact_name text,
  emergency_contact_phone text,
  national_insurance text,
  utr text
);

-- pre-induction sections
CREATE TABLE firebase_staging.pre_induction_personal (
  user_id text PRIMARY KEY,
  full_name text,
  date_of_birth text,
  phone text,
  email text,
  address text,
  emergency_contact_name text,
  emergency_contact_relationship text,
  emergency_contact_phone text,
  national_insurance text,
  utr text
);

CREATE TABLE firebase_staging.pre_induction_right_to_work (
  user_id text PRIMARY KEY,
  passport_url text,
  passport_expiry text,
  visa_url text,
  visa_expiry text,
  share_code text,
  proof_of_address_url text,
  right_to_work_verified boolean
);

CREATE TABLE firebase_staging.pre_induction_certifications (
  user_id text PRIMARY KEY,
  certifications text  -- JSON array
);

CREATE TABLE firebase_staging.pre_induction_medical (
  user_id text PRIMARY KEY,
  medical_declaration text,
  fit_to_work boolean,
  allergies text,
  medication text,
  medical_certificate_url text,
  medical_verified boolean
);

CREATE TABLE firebase_staging.pre_induction_training (
  user_id text PRIMARY KEY,
  rams_accepted boolean,
  rams_accepted_at text,
  rams_version text,
  training_records text,
  rams_required_version text,
  rams_status text
);

CREATE TABLE firebase_staging.pre_induction_declarations (
  user_id text PRIMARY KEY,
  operative_declaration_accepted boolean,
  operative_declaration_accepted_at text
);

-- user site inductions
CREATE TABLE firebase_staging.user_site_inductions (
  user_id text,
  site_id text,
  status text,
  completed_at text,
  grandfathered boolean,
  PRIMARY KEY (user_id, site_id)
);

-- notices read
CREATE TABLE firebase_staging.notices_read (
  user_uid text,
  notice_id text,
  read_at text,
  PRIMARY KEY (user_uid, notice_id)
);

-- settings
CREATE TABLE firebase_staging.settings (
  id text PRIMARY KEY,
  company_id text,
  config text
);

-- medical records & upload logs
CREATE TABLE firebase_staging.medical_records (
  id text,
  user_id text,
  title text,
  notes text,
  file_name text,
  file_url text,
  storage_path text,
  created_at text
);

CREATE TABLE firebase_staging.upload_logs (
  user_id text,
  path text,
  created_at text,
  extra text
);

-- =============================================================================
-- Timestamp conversion notes:
-- - Firestore Timestamp: use _seconds from toDate() or toMillis()/1000
-- - ISO8601 string: use as-is with ::timestamptz cast
-- - Regex f.field ~ '^\d+$' detects numeric epoch
-- =============================================================================
