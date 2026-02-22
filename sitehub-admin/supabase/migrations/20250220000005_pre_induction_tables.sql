-- Pre-induction tables (required for mobile and admin pre-induction flows)
CREATE TABLE IF NOT EXISTS pre_induction_personal (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  date_of_birth DATE,
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,
  national_insurance TEXT,
  utr TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pre_induction_right_to_work (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  passport_url TEXT,
  visa_url TEXT,
  share_code TEXT,
  right_to_work_verified BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pre_induction_certifications (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  certifications JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pre_induction_medical (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  medical_declaration TEXT,
  fit_to_work BOOLEAN,
  medical_certificate_url TEXT,
  medical_verified BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pre_induction_training (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  training_records JSONB DEFAULT '[]',
  rams_accepted BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pre_induction_declarations (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  operative_declaration_accepted BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- users.admin_pre_induction_override for override feature
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_pre_induction_override BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pre_induction_status TEXT DEFAULT 'not_started';
