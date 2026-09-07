-- Security: user sessions, auth audit logs, 2FA scaffolding
-- Sessions for device/session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_type TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked ON user_sessions(revoked_at) WHERE revoked_at IS NULL;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Auth audit logs (success, failure, blocked)
CREATE TABLE IF NOT EXISTS auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email_attempted TEXT,
  ip_address TEXT,
  user_agent TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_outcome ON auth_logs(outcome);
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

-- Known devices for suspicious login detection
CREATE TABLE IF NOT EXISTS user_known_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_fingerprint TEXT,
  ip_address TEXT,
  country TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_user_known_devices_user_id ON user_known_devices(user_id);
ALTER TABLE user_known_devices ENABLE ROW LEVEL SECURITY;

-- 2FA scaffolding (placeholder, not implemented)
CREATE TABLE IF NOT EXISTS user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  method TEXT CHECK (method IN ('totp', 'webauthn')),
  secret_encrypted TEXT,
  enabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_2fa_user_id ON user_2fa(user_id);
ALTER TABLE user_2fa ENABLE ROW LEVEL SECURITY;

-- Passkey credentials (WebAuthn)
CREATE TABLE IF NOT EXISTS user_passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  sign_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, credential_id)
);

CREATE INDEX IF NOT EXISTS idx_user_passkeys_user_id ON user_passkeys(user_id);
ALTER TABLE user_passkeys ENABLE ROW LEVEL SECURITY;

-- RLS: No policies = only service role (bypasses RLS) can access. Blocks anon/authenticated.
