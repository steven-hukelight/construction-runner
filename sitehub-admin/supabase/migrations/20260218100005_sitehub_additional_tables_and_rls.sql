-- Construction Runner: Additional tables and RLS (sitehub-admin)
-- Mirrors root supabase/migrations/20260218100008

CREATE TABLE IF NOT EXISTS coshh (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  title TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coshh_company_id ON coshh(company_id);
ALTER TABLE coshh ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  companyId TEXT,
  config JSONB DEFAULT '{}',
  display JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_settings_company_id ON settings(company_id) WHERE company_id IS NOT NULL;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS profile_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  issuer TEXT,
  issue_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profile_training_profile_id ON profile_training(profile_id);
ALTER TABLE profile_training ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS profile_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  issuer TEXT,
  issue_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profile_certifications_profile_id ON profile_certifications(profile_id);
ALTER TABLE profile_certifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_registrations_company_id ON registrations(company_id) WHERE company_id IS NOT NULL;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS site_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  category TEXT,
  title TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_rules_company_id ON site_rules(company_id);
ALTER TABLE site_rules ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS user_pre_induction_profile (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_pre_induction_profile_user_id ON user_pre_induction_profile(user_id) WHERE user_id IS NOT NULL;
ALTER TABLE user_pre_induction_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
