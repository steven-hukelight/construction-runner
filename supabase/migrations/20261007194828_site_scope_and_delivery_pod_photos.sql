-- Site-wide flag so an admin can publish an item to every site in the company.
-- Deliveries can store more than one proof-of-delivery photo.

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS pod_photos jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS site_wide boolean NOT NULL DEFAULT false;

ALTER TABLE public.rams
  ADD COLUMN IF NOT EXISTS site_wide boolean NOT NULL DEFAULT false;

ALTER TABLE public.briefings
  ADD COLUMN IF NOT EXISTS site_wide boolean NOT NULL DEFAULT false;

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS site_wide boolean NOT NULL DEFAULT false;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS site_wide boolean NOT NULL DEFAULT false;

ALTER TABLE public.coshh
  ADD COLUMN IF NOT EXISTS site_wide boolean NOT NULL DEFAULT false;

ALTER TABLE public.site_rules
  ADD COLUMN IF NOT EXISTS site_wide boolean NOT NULL DEFAULT false;

ALTER TABLE public.safety_alerts
  ADD COLUMN IF NOT EXISTS site_wide boolean NOT NULL DEFAULT false;
