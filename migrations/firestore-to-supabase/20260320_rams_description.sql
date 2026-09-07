-- Optional notes shown on RAMS detail in admin web app.
ALTER TABLE public.rams ADD COLUMN IF NOT EXISTS description text;
