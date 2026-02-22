-- Drop other potentially restrictive CHECK constraints that could block app writes.
-- These may have been added by Supabase Studio or external migrations.
-- Safe: DROP CONSTRAINT IF EXISTS is a no-op if the constraint doesn't exist.

-- invite_codes.role: app uses 'sub_admin' and may use other role values
ALTER TABLE invite_codes DROP CONSTRAINT IF EXISTS invite_codes_role_check;

-- registrations.status: app uses various statuses (PENDING, APPROVED, etc.)
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_status_check;

-- user_site_inductions.status: app uses not_started, in_progress, completed, etc.
ALTER TABLE user_site_inductions DROP CONSTRAINT IF EXISTS user_site_inductions_status_check;

-- tasks.status: app uses pending, in_progress, completed, etc.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- rams.status: app uses PENDING, APPROVED, etc.
ALTER TABLE rams DROP CONSTRAINT IF EXISTS rams_status_check;

-- assets.status: app uses active, inactive, etc.
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_status_check;

-- briefings.status if it exists
ALTER TABLE briefings DROP CONSTRAINT IF EXISTS briefings_status_check;

-- safety_alerts.status
ALTER TABLE safety_alerts DROP CONSTRAINT IF EXISTS safety_alerts_status_check;

-- near_miss_reports.status
ALTER TABLE near_miss_reports DROP CONSTRAINT IF EXISTS near_miss_reports_status_check;
