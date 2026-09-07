-- Per-user email notification preferences (admin / supervisor / sub_admin)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notification_preferences JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN users.email_notification_preferences IS 'Optional JSON overrides, e.g. {"operativePendingApproval":false} to opt out of pending-approval emails';
