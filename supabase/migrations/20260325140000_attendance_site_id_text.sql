-- attendance / attendance_archive: site_id must be TEXT to match sites.id (opaque string ids, not only UUID).
-- Fixes: invalid input syntax for type uuid when filtering/deleting by site id.
-- Idempotent for already-TEXT columns (USING site_id::text).

ALTER TABLE attendance
  ALTER COLUMN site_id TYPE TEXT USING site_id::text;

ALTER TABLE attendance_archive
  ALTER COLUMN site_id TYPE TEXT USING site_id::text;

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_site_id_fkey;

ALTER TABLE attendance
  ADD CONSTRAINT attendance_site_id_fkey
  FOREIGN KEY (site_id) REFERENCES public.sites (id) ON DELETE CASCADE;

-- Same UUID/text mismatch for other tables the site-delete purge touches (core schema used UUID).
ALTER TABLE tasks
  ALTER COLUMN site_id TYPE TEXT USING site_id::text;

ALTER TABLE deliveries
  ALTER COLUMN site_id TYPE TEXT USING site_id::text;

ALTER TABLE rams
  ALTER COLUMN site_id TYPE TEXT USING site_id::text;
