-- COSHH API expects these columns (admin dashboard). Safe to re-run.
ALTER TABLE public.coshh ADD COLUMN IF NOT EXISTS substance text;
ALTER TABLE public.coshh ADD COLUMN IF NOT EXISTS hazard_symbols jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.coshh ADD COLUMN IF NOT EXISTS ppe text;
ALTER TABLE public.coshh ADD COLUMN IF NOT EXISTS file_url text;
