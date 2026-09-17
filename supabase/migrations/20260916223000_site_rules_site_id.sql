-- Site rules belong to one site folder (same model as tasks / briefings / RAMS).
ALTER TABLE public.site_rules
  ADD COLUMN IF NOT EXISTS site_id text;

CREATE INDEX IF NOT EXISTS idx_site_rules_site_id ON public.site_rules (site_id);

COMMENT ON COLUMN public.site_rules.site_id IS
  'Site folder this rule belongs to. Site Admins only see rules for assigned sites.';
