-- Legacy clients and some UIs still reference `profiles.jobtitle`; production only has `job_title`.
-- Add a stored generated column so SELECTs on `jobtitle` succeed and stay in sync with `job_title`.

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'jobtitle'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN jobtitle text GENERATED ALWAYS AS (job_title) STORED;
  END IF;
END
$do$;

COMMENT ON COLUMN public.profiles.jobtitle IS
  'Alias for job_title (generated). Prefer job_title in new code.';
