-- Company default induction safety pack, per-site copies, and induction step acks.

CREATE TABLE IF NOT EXISTS public.induction_safety_templates (
  company_id TEXT PRIMARY KEY,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS public.site_induction_safety (
  site_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  copied_from_template_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS site_induction_safety_company_id_idx
  ON public.site_induction_safety (company_id);

ALTER TABLE public.user_site_inductions
  ADD COLUMN IF NOT EXISTS safety_acked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rules_acked_at TIMESTAMPTZ;

ALTER TABLE public.induction_safety_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_induction_safety ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.induction_safety_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_induction_safety TO service_role;
GRANT SELECT ON public.induction_safety_templates TO authenticated;
GRANT SELECT ON public.site_induction_safety TO authenticated;

COMMENT ON TABLE public.induction_safety_templates IS
  'Company-wide default safety information shown during site induction. Copied to each site, then edited per site.';
COMMENT ON TABLE public.site_induction_safety IS
  'Site-specific safety information for induction. Starts as a copy of the company default.';
