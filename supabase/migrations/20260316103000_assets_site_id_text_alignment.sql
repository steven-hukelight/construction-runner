ALTER TABLE public.assets
ALTER COLUMN site_id TYPE text
USING site_id::text;
