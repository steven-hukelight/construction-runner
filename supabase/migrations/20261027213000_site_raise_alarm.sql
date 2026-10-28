-- Site Raise Alarm: per-site emergency plans (fire strategy, site plan, muster points),
-- alarms raised from the app, and each person's muster response.
-- Every read and write goes through the admin API with the service role.

create table public.site_emergency_plans (
  site_id text primary key references public.sites(id) on delete cascade,
  company_id text not null,
  muster_points jsonb not null default '[]'::jsonb,
  fire_strategy_path text,
  fire_strategy_mime text,
  fire_strategy_name text,
  site_plan_path text,
  site_plan_width integer,
  site_plan_height integer,
  instructions jsonb not null default '{}'::jsonb,
  first_aid_info text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null,
  constraint site_emergency_plans_muster_points_array check (jsonb_typeof(muster_points) = 'array'),
  constraint site_emergency_plans_instructions_object check (jsonb_typeof(instructions) = 'object')
);

create index idx_site_emergency_plans_company on public.site_emergency_plans (company_id);

create table public.site_alarms (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  site_id text not null references public.sites(id) on delete cascade,
  type text not null check (type in ('fire', 'medical', 'lockdown', 'structural')),
  status text not null default 'active' check (status in ('active', 'stood_down')),
  is_drill boolean not null default false,
  raised_by uuid references public.users(id) on delete set null,
  raised_by_name text not null,
  raised_by_role text,
  raised_at timestamptz not null default now(),
  raised_lat double precision,
  raised_lng double precision,
  note text check (note is null or char_length(note) <= 500),
  additional_raisers jsonb not null default '[]'::jsonb,
  audience_snapshot jsonb not null default '[]'::jsonb,
  stood_down_by uuid references public.users(id) on delete set null,
  stood_down_by_name text,
  stood_down_at timestamptz,
  stand_down_reason text check (stand_down_reason is null or char_length(stand_down_reason) <= 500),
  outcome text check (outcome is null or outcome in ('genuine', 'drill', 'false_alarm')),
  constraint site_alarms_stand_down_complete check (
    (status = 'active' and stood_down_at is null) or (status = 'stood_down' and stood_down_at is not null)
  )
);

create unique index site_alarms_one_active_per_site on public.site_alarms (site_id) where status = 'active';
create index idx_site_alarms_company_raised on public.site_alarms (company_id, raised_at desc);
create index idx_site_alarms_site_raised on public.site_alarms (site_id, raised_at desc);

create table public.site_alarm_responses (
  alarm_id uuid not null references public.site_alarms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('safe', 'need_help', 'responding')),
  responded_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  primary key (alarm_id, user_id)
);

alter table public.site_emergency_plans enable row level security;
alter table public.site_alarms enable row level security;
alter table public.site_alarm_responses enable row level security;

revoke all on public.site_emergency_plans from anon, authenticated;
revoke all on public.site_alarms from anon, authenticated;
revoke all on public.site_alarm_responses from anon, authenticated;

grant select, insert, update, delete on public.site_emergency_plans to service_role;
grant select, insert, update, delete on public.site_alarms to service_role;
grant select, insert, update, delete on public.site_alarm_responses to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-emergency-plans',
  'site-emergency-plans',
  false,
  26214400,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No policies for anon or authenticated: default-deny. Uploads and reads go through
-- the admin API, which uses the service role and issues short-lived signed URLs.
