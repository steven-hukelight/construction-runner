CREATE TABLE IF NOT EXISTS alert_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES safety_alerts(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, alert_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_acknowledgements_user_id
  ON alert_acknowledgements(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_acknowledgements_alert_id
  ON alert_acknowledgements(alert_id);

ALTER TABLE alert_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS site_rule_favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_rule_id UUID NOT NULL REFERENCES site_rules(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, site_rule_id)
);

CREATE INDEX IF NOT EXISTS idx_site_rule_favourites_user_id
  ON site_rule_favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_site_rule_favourites_rule_id
  ON site_rule_favourites(site_rule_id);

ALTER TABLE site_rule_favourites ENABLE ROW LEVEL SECURITY;
