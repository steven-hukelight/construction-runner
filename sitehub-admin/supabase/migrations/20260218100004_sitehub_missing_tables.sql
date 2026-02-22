-- SiteHub: Missing tables for API compatibility (sitehub-admin)
-- Idempotent: CREATE IF NOT EXISTS
-- Mirrors root supabase/migrations/20260218100007

CREATE TABLE IF NOT EXISTS invite_codes (
  id TEXT PRIMARY KEY,
  type TEXT DEFAULT 'subcontractor',
  main_contractor_id TEXT,
  site_id TEXT,
  role TEXT DEFAULT 'sub_admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profile_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  userid UUID,
  address TEXT,
  town TEXT,
  postcode TEXT,
  date_of_birth TEXT,
  job_title TEXT,
  jobtitle TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  national_insurance TEXT,
  nationalinsurance TEXT,
  utr TEXT,
  cscs_number TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_profile_data_user_id ON user_profile_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_data_userid ON user_profile_data(userid) WHERE userid IS NOT NULL;
ALTER TABLE user_profile_data ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS assigned_operatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  userid UUID,
  assigned_at TIMESTAMPTZ,
  assignedat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_assigned_operatives_site_id ON assigned_operatives(site_id);
CREATE INDEX IF NOT EXISTS idx_assigned_operatives_user_id ON assigned_operatives(user_id);
ALTER TABLE assigned_operatives ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS site_subcontractors (
  site_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (site_id, company_id)
);
CREATE INDEX IF NOT EXISTS idx_site_subcontractors_company_id ON site_subcontractors(company_id);
ALTER TABLE site_subcontractors ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS user_site_inductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL,
  status TEXT DEFAULT 'not_started',
  completed_at TIMESTAMPTZ,
  grandfathered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, site_id)
);
CREATE INDEX IF NOT EXISTS idx_user_site_inductions_user_id ON user_site_inductions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_site_inductions_site_id ON user_site_inductions(site_id);
ALTER TABLE user_site_inductions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  site_id TEXT,
  title TEXT,
  body TEXT,
  file_url TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_briefings_company_id ON briefings(company_id);
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS briefing_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  briefing_id UUID NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  signature_url TEXT,
  UNIQUE(user_id, briefing_id)
);
CREATE INDEX IF NOT EXISTS idx_briefing_acknowledgements_user_id ON briefing_acknowledgements(user_id);
CREATE INDEX IF NOT EXISTS idx_briefing_acknowledgements_briefing_id ON briefing_acknowledgements(briefing_id);
ALTER TABLE briefing_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS safety_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  site_id TEXT,
  title TEXT,
  description TEXT,
  body TEXT,
  severity TEXT DEFAULT 'medium',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_company_id ON safety_alerts(company_id);
ALTER TABLE safety_alerts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id TEXT,
  actor_email TEXT,
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
