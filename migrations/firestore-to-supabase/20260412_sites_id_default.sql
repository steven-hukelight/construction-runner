-- Sites created without an explicit id must still satisfy NOT NULL on public.sites.id.
-- Safe to run if default already exists (idempotent enough for manual re-run).
ALTER TABLE public.sites
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
