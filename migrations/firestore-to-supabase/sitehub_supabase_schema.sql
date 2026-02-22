-- SiteHub Supabase SQL Schema (auto-generated)

-- Companies
create table companies (
  id uuid primary key,
  name text not null,
  createdAt timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table companies enable row level security;

-- Users
create table users (
  id uuid primary key,
  email text not null,
  companyId uuid not null references companies(id) on delete cascade,
  role text not null,
  profileId text,
  status text,
  createdAt timestamptz not null default now(),
  disabled boolean,
  approved boolean,
  superuser boolean,
  updated_at timestamptz not null default now()
);
create index idx_users_companyId on users(companyId);
create index idx_users_companyId_createdAt on users(companyId, createdAt);
alter table users enable row level security;

-- Sites
create table sites (
  id uuid primary key,
  companyId uuid not null references companies(id) on delete cascade,
  name text not null,
  createdAt timestamptz not null default now(),
  assignedUsers jsonb,
  ramsVersion text,
  mainContractorId text,
  updated_at timestamptz not null default now()
);
create index idx_sites_companyId on sites(companyId);
create index idx_sites_companyId_createdAt on sites(companyId, createdAt);
alter table sites enable row level security;

-- Attendance
create table attendance (
  id uuid primary key,
  userId uuid not null references users(id) on delete cascade,
  siteId uuid not null references sites(id) on delete cascade,
  companyId uuid not null references companies(id) on delete cascade,
  action text not null,
  timestamp timestamptz not null default now(),
  latitude numeric,
  longitude numeric,
  accuracy numeric,
  email text,
  updated_at timestamptz not null default now()
);
create index idx_attendance_companyId on attendance(companyId);
create index idx_attendance_companyId_createdAt on attendance(companyId, timestamp);
create index idx_attendance_siteId_createdAt on attendance(siteId, timestamp);
create index idx_attendance_userId_timestamp on attendance(userId, timestamp);
alter table attendance enable row level security;

-- Tasks
create table tasks (
  id uuid primary key,
  siteId uuid not null references sites(id) on delete cascade,
  companyId uuid not null references companies(id) on delete cascade,
  assignedTo uuid not null references users(id) on delete cascade,
  status text not null,
  description text not null,
  createdAt timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_companyId on tasks(companyId);
create index idx_tasks_companyId_createdAt on tasks(companyId, createdAt);
create index idx_tasks_siteId_createdAt on tasks(siteId, createdAt);
alter table tasks enable row level security;

-- Notices
create table notices (
  id uuid primary key,
  siteId uuid not null references sites(id) on delete cascade,
  companyId uuid not null references companies(id) on delete cascade,
  title text not null,
  body text not null,
  attachments jsonb,
  createdAt timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_notices_companyId on notices(companyId);
create index idx_notices_companyId_createdAt on notices(companyId, createdAt);
create index idx_notices_siteId_createdAt on notices(siteId, createdAt);
alter table notices enable row level security;

-- Deliveries
create table deliveries (
  id uuid primary key,
  siteId uuid not null references sites(id) on delete cascade,
  companyId uuid not null references companies(id) on delete cascade,
  deliveredBy uuid not null references users(id) on delete cascade,
  proofPhotos jsonb,
  createdAt timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_deliveries_companyId on deliveries(companyId);
create index idx_deliveries_companyId_createdAt on deliveries(companyId, createdAt);
create index idx_deliveries_siteId_createdAt on deliveries(siteId, createdAt);
alter table deliveries enable row level security;

-- RAMS
create table rams (
  id uuid primary key,
  siteId uuid not null references sites(id) on delete cascade,
  companyId uuid not null references companies(id) on delete cascade,
  type text not null,
  fileUrl text not null,
  version text,
  createdAt timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_rams_companyId on rams(companyId);
create index idx_rams_companyId_createdAt on rams(companyId, createdAt);
create index idx_rams_siteId_createdAt on rams(siteId, createdAt);
alter table rams enable row level security;

-- Briefings
create table briefings (
  id uuid primary key,
  companyId uuid not null references companies(id) on delete cascade,
  title text,
  body text,
  createdAt timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_briefings_companyId on briefings(companyId);
create index idx_briefings_companyId_createdAt on briefings(companyId, createdAt);
alter table briefings enable row level security;

-- COSHH
create table coshh (
  id uuid primary key,
  companyId uuid not null references companies(id) on delete cascade,
  title text,
  body text,
  createdAt timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_coshh_companyId on coshh(companyId);
create index idx_coshh_companyId_createdAt on coshh(companyId, createdAt);
alter table coshh enable row level security;

-- Site Rules
create table site_rules (
  id uuid primary key,
  companyId uuid not null references companies(id) on delete cascade,
  title text,
  body text,
  createdAt timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_site_rules_companyId on site_rules(companyId);
create index idx_site_rules_companyId_createdAt on site_rules(companyId, createdAt);
alter table site_rules enable row level security;

-- Safety Alerts
create table safety_alerts (
  id uuid primary key,
  companyId uuid not null references companies(id) on delete cascade,
  title text,
  body text,
  createdAt timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_safety_alerts_companyId on safety_alerts(companyId);
create index idx_safety_alerts_companyId_createdAt on safety_alerts(companyId, createdAt);
alter table safety_alerts enable row level security;

-- Certifications (as subcollection under profiles)
create table certifications (
  id uuid primary key,
  profileId uuid not null,
  userId uuid not null references users(id) on delete cascade,
  type text not null,
  issuedAt timestamptz not null,
  expiresAt timestamptz,
  updated_at timestamptz not null default now()
);
create index idx_certifications_profileId on certifications(profileId);
create index idx_certifications_userId on certifications(userId);
alter table certifications enable row level security;

-- Training (as subcollection under profiles)
create table training (
  id uuid primary key,
  profileId uuid not null,
  userId uuid not null references users(id) on delete cascade,
  type text not null,
  completedAt timestamptz not null,
  updated_at timestamptz not null default now()
);
create index idx_training_profileId on training(profileId);
create index idx_training_userId on training(userId);
alter table training enable row level security;

-- User Profile Data (as subcollection)
create table user_profile_data (
  id uuid primary key,
  userId uuid not null references users(id) on delete cascade,
  address text,
  town text,
  postcode text,
  dateOfBirth text,
  jobTitle text,
  emergencyContactName text,
  emergencyContactPhone text,
  nationalInsurance text,
  utr text,
  updated_at timestamptz not null default now()
);
create index idx_user_profile_data_userId on user_profile_data(userId);
alter table user_profile_data enable row level security;

-- Sites → Assigned Operatives (subcollection)
create table assigned_operatives (
  id uuid primary key,
  siteId uuid not null references sites(id) on delete cascade,
  userId uuid not null references users(id) on delete cascade,
  assignedAt timestamptz not null,
  updated_at timestamptz not null default now()
);
create index idx_assigned_operatives_siteId on assigned_operatives(siteId);
create index idx_assigned_operatives_userId on assigned_operatives(userId);
alter table assigned_operatives enable row level security;

-- Settings (global and per company)
create table settings (
  id uuid primary key,
  companyId uuid references companies(id) on delete cascade,
  config jsonb not null,
  updated_at timestamptz not null default now()
);
create index idx_settings_companyId on settings(companyId);
alter table settings enable row level security;

-- Updated_at triggers
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'companies','users','sites','attendance','tasks','notices','deliveries','rams',
    'briefings','coshh','site_rules','safety_alerts','certifications','training',
    'user_profile_data','assigned_operatives','settings'
  ]
  loop
    execute format('
      drop trigger if exists set_updated_at on %I;
      create trigger set_updated_at
      before update on %I
      for each row
      execute procedure set_updated_at();
    ', tbl, tbl);
  end loop;
end $$;