-- =============================================================================
-- FIRESTORE RECONSTRUCTION - SUPABASE SCHEMA
-- Derived entirely from Firestore JSON export. No prior schema assumptions.
-- Uses TEXT for id (Firestore document IDs) to preserve them exactly.
-- =============================================================================

-- TABLES (order: parents first, resolve circular refs)
CREATE TABLE IF NOT EXISTS firestore_companies (
  id TEXT PRIMARY KEY,
  invite_code TEXT,
  name TEXT NOT NULL,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS firestore_users (
  id TEXT PRIMARY KEY,
  uid TEXT,
  company_id TEXT REFERENCES firestore_companies(id),
  profile_id TEXT,
  email TEXT,
  role TEXT,
  disabled boolean DEFAULT false,
  approved boolean,
  superuser boolean,
  status TEXT,
  name TEXT,
  display_name TEXT,
  phone TEXT,
  notes TEXT,
  bio TEXT,
  avatar TEXT,
  location TEXT,
  fcm_token TEXT,
  pre_induction_status TEXT,
  admin_pre_induction_override boolean,
  compliance_score integer,
  last_login timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  date_of_birth TEXT,
  address_line1 TEXT,
  town TEXT,
  postcode TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  national_insurance TEXT,
  ni_number TEXT,
  utr TEXT,
  utr_number TEXT,
  job_title TEXT,
  edit_history jsonb,
  setup_complete boolean,
  notifications_enabled boolean,
  biometric_enabled boolean,
  dark_mode boolean,
  photo_url TEXT,
  last_seen timestamptz
);

CREATE TABLE IF NOT EXISTS firestore_sites (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES firestore_companies(id),
  name TEXT,
  location jsonb,
  geofence jsonb,
  latitude numeric,
  longitude numeric,
  radius_meters numeric,
  show_on_map boolean DEFAULT true,
  active boolean DEFAULT true,
  manager_id TEXT REFERENCES firestore_users(id),
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS firestore_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES firestore_users(id),
  address_line1 TEXT,
  town TEXT,
  postcode TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  job_title TEXT,
  national_insurance TEXT,
  ni_number TEXT,
  utr TEXT,
  utr_number TEXT,
  date_of_birth TEXT,
  updated_at timestamptz
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_profile') THEN
    ALTER TABLE firestore_users ADD CONSTRAINT fk_users_profile FOREIGN KEY (profile_id) REFERENCES firestore_profiles(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS firestore_tasks (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES firestore_companies(id),
  site_id TEXT REFERENCES firestore_sites(id),
  title TEXT,
  description TEXT,
  status TEXT,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS firestore_notices (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES firestore_companies(id),
  site_id TEXT REFERENCES firestore_sites(id),
  title TEXT,
  body TEXT,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS firestore_deliveries (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES firestore_companies(id),
  site_id TEXT REFERENCES firestore_sites(id),
  created_by TEXT REFERENCES firestore_users(id),
  pod_url TEXT,
  load_url TEXT,
  wholesaler TEXT,
  status TEXT,
  reference TEXT,
  site TEXT,
  notes TEXT,
  scheduled_at timestamptz,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS firestore_settings (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  display jsonb,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS firestore_registrations (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  email TEXT,
  name TEXT,
  company_name TEXT,
  role TEXT,
  status TEXT,
  created_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz
);

-- Subcollections
CREATE TABLE IF NOT EXISTS firestore_user_profile (
  user_id TEXT NOT NULL REFERENCES firestore_users(id),
  doc_id TEXT NOT NULL DEFAULT 'data',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  job_title TEXT,
  ni_number TEXT,
  utr_number TEXT,
  date_of_birth TEXT,
  edit_history jsonb,
  updated_at timestamptz,
  PRIMARY KEY (user_id, doc_id)
);

CREATE TABLE IF NOT EXISTS firestore_pre_induction_personal (
  user_id TEXT PRIMARY KEY REFERENCES firestore_users(id),
  full_name TEXT,
  date_of_birth TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,
  trade TEXT,
  national_insurance_number TEXT,
  payroll_number TEXT,
  job_role TEXT,
  employer_company_id TEXT,
  supervisor_name TEXT,
  utr_number TEXT,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS firestore_pre_induction_declarations (
  user_id TEXT PRIMARY KEY REFERENCES firestore_users(id),
  operative_declaration_accepted boolean,
  operative_declaration_accepted_at timestamptz,
  supervisor_declaration_accepted boolean,
  supervisor_declaration_accepted_at timestamptz,
  operative_signature_url TEXT,
  notes TEXT,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS firestore_profile_certifications (
  id TEXT NOT NULL,
  profile_id TEXT NOT NULL REFERENCES firestore_profiles(id),
  title TEXT,
  issuer TEXT,
  issue_date timestamptz,
  expiry_date timestamptz,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at timestamptz,
  updated_at timestamptz,
  PRIMARY KEY (profile_id, id)
);

CREATE TABLE IF NOT EXISTS firestore_profile_training (
  id TEXT NOT NULL,
  profile_id TEXT NOT NULL REFERENCES firestore_profiles(id),
  title TEXT,
  issuer TEXT,
  issue_date timestamptz,
  expiry_date timestamptz,
  completed_at timestamptz,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at timestamptz,
  updated_at timestamptz,
  PRIMARY KEY (profile_id, id)
);

-- Empty collections (structure from Firestore rules)
CREATE TABLE IF NOT EXISTS firestore_attendance (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  company_id TEXT,
  site_id TEXT,
  action TEXT,
  "timestamp" timestamptz
);

CREATE TABLE IF NOT EXISTS firestore_rams (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  site_id TEXT
);

CREATE TABLE IF NOT EXISTS firestore_briefings (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  site_id TEXT
);
