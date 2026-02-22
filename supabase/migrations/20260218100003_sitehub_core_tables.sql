-- SiteHub: tasks, notices, rams, attendance, deliveries, certifications, medical_records
-- Idempotent: CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  site_id UUID,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  description TEXT,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Notices
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  site_id UUID,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notices_company_id ON notices(company_id);
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- RAMS
CREATE TABLE IF NOT EXISTS rams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  site_id UUID,
  title TEXT,
  status TEXT DEFAULT 'PENDING',
  url TEXT,
  version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rams_company_id ON rams(company_id);
ALTER TABLE rams ENABLE ROW LEVEL SECURITY;

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id UUID,
  company_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude NUMERIC,
  longitude NUMERIC,
  accuracy NUMERIC,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp DESC);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  site_id UUID,
  delivered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  proof_photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deliveries_company_id ON deliveries(company_id);
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Certifications (profile certs linked to user)
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID,
  type TEXT,
  title TEXT,
  issuer TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certifications_user_id ON certifications(user_id);
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

-- Medical records (user medical docs)
CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  notes TEXT,
  file_name TEXT,
  file_url TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medical_records_user_id ON medical_records(user_id);
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
