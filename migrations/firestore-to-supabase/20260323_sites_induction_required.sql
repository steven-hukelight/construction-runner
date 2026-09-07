-- Align public.sites with admin API (PATCH /api/sites/[id] inductionRequired → induction_required).
-- Run in Supabase SQL Editor or via migration pipeline.

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS induction_required boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sites.induction_required IS 'If true, site induction is required for operatives (matches Edit Site UI).';
