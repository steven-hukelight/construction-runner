-- A training module can apply to the whole company or only to chosen sites. Site-based modules
-- apply to people linked to any of those sites (assigned, inducted, site staff, site manager),
-- the same audience as site-scoped documents.

alter table public.company_training_modules
  add column if not exists scope text not null default 'company';

alter table public.company_training_modules
  drop constraint if exists company_training_modules_scope_check,
  add constraint company_training_modules_scope_check check (scope in ('company', 'sites'));

create table if not exists public.company_training_module_sites (
  company_id text not null,
  module_id text not null,
  site_id text not null references public.sites(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, module_id, site_id),
  foreign key (company_id, module_id)
    references public.company_training_modules(company_id, module_id) on delete cascade
);

create index if not exists idx_company_training_module_sites_site
  on public.company_training_module_sites (site_id);

alter table public.company_training_module_sites enable row level security;
revoke all on public.company_training_module_sites from anon, authenticated;
grant select, insert, update, delete on public.company_training_module_sites to service_role;
