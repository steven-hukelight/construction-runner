-- Migration: Backfill public.users from existing auth.users
-- DISABLED: auth.users contains non-UUID ids (e.g. Firebase-style) incompatible with public.users(uuid).
-- Use sync trigger or manual sync for UUID-only auth. Safe no-op.
DO $$ BEGIN NULL; END $$;
