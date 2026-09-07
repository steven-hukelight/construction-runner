-- notices: early drift migrations added site_id as UUID; later "ADD TEXT" was skipped because the column existed.
-- message_threads: site_id was UUID in schema_alignment.
-- Align with sites.id (opaque string ids).

ALTER TABLE notices
  ALTER COLUMN site_id TYPE TEXT USING site_id::text;

ALTER TABLE message_threads
  ALTER COLUMN site_id TYPE TEXT USING site_id::text;
