-- Deleting a site should remove dependent attendance rows (API also purges explicitly).
-- Idempotent: drop named FK if present, then re-add with ON DELETE CASCADE.

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_site_id_fkey;

ALTER TABLE attendance
  ADD CONSTRAINT attendance_site_id_fkey
  FOREIGN KEY (site_id) REFERENCES public.sites (id) ON DELETE CASCADE;
