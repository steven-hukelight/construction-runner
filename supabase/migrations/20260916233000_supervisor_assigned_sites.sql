-- Supervisors use user_sites the same way Site Admins do (many sites per person).
-- Existing supervisors keep every site in their company until a Super Admin trims the ticks.

COMMENT ON TABLE public.user_sites IS
  'Sites a site_admin or supervisor may see. Multiple rows per user are allowed. Company Super Admin and superuser ignore this table.';

INSERT INTO public.user_sites (user_id, site_id)
SELECT u.id, s.id
FROM public.users u
INNER JOIN public.sites s ON s.company_id = u.company_id
WHERE LOWER(TRIM(COALESCE(u.role, ''))) = 'supervisor'
  AND u.company_id IS NOT NULL
  AND btrim(u.company_id) <> ''
ON CONFLICT (user_id, site_id) DO NOTHING;
