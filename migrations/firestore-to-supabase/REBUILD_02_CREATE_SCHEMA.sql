-- =============================================================================
-- SITEHUB REBUILD - STEP 2: CREATE CLEAN SCHEMA
-- =============================================================================
-- UUID for users.id (matches auth.uid()), firebase_uid for Firestore mapping.
-- TEXT for companies, sites, profiles (Firestore IDs).
-- =============================================================================

-- Companies (Firestore id preserved)
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Users: id = UUID (for auth.uid()), firebase_uid = Firestore UID for mapping
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE,
  company_id TEXT REFERENCES companies(id),
  email TEXT,
  phone TEXT,
  display_name TEXT,
  name TEXT,
  role TEXT,
  status TEXT,
  disabled boolean DEFAULT false,
  approved boolean,
  superuser boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Sites (Firestore id)
CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  name TEXT,
  location jsonb,
  geofence jsonb,
  latitude numeric,
  longitude numeric,
  radius_meters numeric,
  show_on_map boolean DEFAULT true,
  active boolean DEFAULT true,
  manager_id UUID REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Profiles: user_id UUID -> users, firebase_uid for backfill
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  firebase_uid TEXT,
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

-- Profile certifications
CREATE TABLE profile_certifications (
  id TEXT NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  title TEXT,
  issuer TEXT,
  issue_date timestamptz,
  expiry_date timestamptz,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  PRIMARY KEY (profile_id, id)
);

-- Profile training
CREATE TABLE profile_training (
  id TEXT NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  title TEXT,
  issuer TEXT,
  issue_date timestamptz,
  expiry_date timestamptz,
  completed_at timestamptz,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  PRIMARY KEY (profile_id, id)
);

-- Deliveries: created_by UUID, firebase_uid for backfill
CREATE TABLE deliveries (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  site_id TEXT REFERENCES sites(id),
  created_by UUID REFERENCES users(id),
  firebase_uid TEXT,
  pod_url TEXT,
  load_url TEXT,
  wholesaler TEXT,
  status TEXT DEFAULT 'PENDING',
  reference TEXT,
  site TEXT,
  notes TEXT,
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Notices
CREATE TABLE notices (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  site_id TEXT REFERENCES sites(id),
  title TEXT,
  body TEXT,
  created_at timestamptz DEFAULT now()
);

-- Notices read (user_id = users.id UUID)
CREATE TABLE notices_read (
  notice_id TEXT REFERENCES notices(id),
  user_id UUID REFERENCES users(id),
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (notice_id, user_id)
);

-- Tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  site_id TEXT REFERENCES sites(id),
  assigned_to UUID REFERENCES users(id),
  title TEXT,
  description TEXT,
  status TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Settings (id = user firebase_uid or custom key)
CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  display jsonb,
  updated_at timestamptz
);

-- Registrations (company_id may reference companies not in export - no FK)
CREATE TABLE registrations (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  email TEXT,
  name TEXT,
  company_name TEXT,
  role TEXT,
  status TEXT,
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  rejected_at timestamptz
);

-- User pre-induction profile (consolidated)
CREATE TABLE user_pre_induction_profile (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  firebase_uid TEXT,
  data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Attendance (user_id, site_id backfilled)
CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  site_id TEXT REFERENCES sites(id),
  company_id TEXT REFERENCES companies(id),
  action TEXT,
  "timestamp" timestamptz DEFAULT now()
);

-- Rams (empty in export; FKs nullable for flexibility)
CREATE TABLE rams (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  site_id TEXT REFERENCES sites(id),
  title TEXT,
  url TEXT,
  created_at timestamptz DEFAULT now()
);

-- Upload logs
CREATE TABLE upload_logs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action TEXT,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
