-- Fix attendance.id: ensure DEFAULT gen_random_uuid() so inserts don't fail with null
-- Some Supabase/Postgres setups may not apply the default; this migration forces it.
ALTER TABLE attendance
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
