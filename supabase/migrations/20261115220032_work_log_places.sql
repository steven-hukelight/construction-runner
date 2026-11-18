-- Where someone worked on a site, split from the attendance clock.
-- A place is a plot, level, or area. An activity is a short label. A segment is one visit.

create table if not exists public.work_places (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  site_id text not null references public.sites(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (site_id, name)
);

create table if not exists public.work_activities (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  site_id text not null references public.sites(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (site_id, name)
);

create table if not exists public.work_segments (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  site_id text not null references public.sites(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  place_id uuid not null references public.work_places(id) on delete restrict,
  activity_id uuid not null references public.work_activities(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  logged_by uuid references public.users(id) on delete set null,
  constraint work_segments_end_after_start check (ended_at is null or ended_at >= started_at)
);

comment on table public.work_segments is
  'One visit to a place. The attendance clock stays separate. No rates and no invoice.';

create index if not exists idx_work_segments_site_started
  on public.work_segments (site_id, started_at desc);

create unique index if not exists work_segments_one_open
  on public.work_segments (user_id)
  where ended_at is null;

alter table public.work_places enable row level security;
alter table public.work_activities enable row level security;
alter table public.work_segments enable row level security;

revoke all on public.work_places from anon, authenticated, public;
revoke all on public.work_activities from anon, authenticated, public;
revoke all on public.work_segments from anon, authenticated, public;

grant select, insert, update, delete on public.work_places to service_role;
grant select, insert, update, delete on public.work_activities to service_role;
grant select, insert, update, delete on public.work_segments to service_role;
