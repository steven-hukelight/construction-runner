-- Seed the global settings row so upserts work.
-- This row stores platform-wide config (branding, feature toggles, etc.)
-- Note: settings.key is NOT NULL in the live schema.
INSERT INTO settings (id, company_id, "key", config)
VALUES ('00000000-0000-0000-0000-000000000001', NULL, 'global', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
