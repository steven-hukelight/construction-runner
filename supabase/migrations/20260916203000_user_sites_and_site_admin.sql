-- Site-scoped admins (not platform superuser).
-- company `admin` = Super Admin (all sites in the company).
-- `site_admin` = only sites listed in user_sites.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  role IS NULL
  OR LOWER(TRIM(role)) IN (
    'admin',
    'site_admin',
    'supervisor',
    'operative',
    'superuser',
    'sub_admin',
    'viewer'
  )
);

CREATE TABLE IF NOT EXISTS public.user_sites (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  site_id text NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, site_id)
);

CREATE INDEX IF NOT EXISTS user_sites_site_id_idx ON public.user_sites (site_id);
CREATE INDEX IF NOT EXISTS user_sites_user_id_idx ON public.user_sites (user_id);

ALTER TABLE public.user_sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_sites_select_own_or_admin ON public.user_sites;
CREATE POLICY user_sites_select_own_or_admin
  ON public.user_sites
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.auth_is_admin_or_above()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sites TO service_role;
GRANT SELECT ON public.user_sites TO authenticated;
GRANT SELECT ON public.user_sites TO postgres;

COMMENT ON TABLE public.user_sites IS
  'Sites a site_admin may see and edit. Company admin (Super Admin) and superuser ignore this table.';
