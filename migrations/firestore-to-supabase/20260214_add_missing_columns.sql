-- Migration: Add missing columns in snake_case for Construction Runner tables

-- Companies
alter table companies add column if not exists created_at timestamptz not null default now();
alter table companies add column if not exists updated_at timestamptz not null default now();

-- Users
alter table users add column if not exists company_id uuid references companies(id) on delete cascade;
alter table users add column if not exists role text;
alter table users add column if not exists profile_id text;
alter table users add column if not exists status text;
alter table users add column if not exists disabled boolean;
alter table users add column if not exists approved boolean;
alter table users add column if not exists superuser boolean;
alter table users add column if not exists created_at timestamptz not null default now();
alter table users add column if not exists updated_at timestamptz not null default now();

-- Sites
alter table sites add column if not exists company_id uuid references companies(id) on delete cascade;
alter table sites add column if not exists assigned_users jsonb;
alter table sites add column if not exists rams_version text;
alter table sites add column if not exists main_contractor_id text;
alter table sites add column if not exists created_at timestamptz not null default now();
alter table sites add column if not exists updated_at timestamptz not null default now();

-- Settings
alter table settings add column if not exists company_id uuid references companies(id) on delete cascade;
alter table settings add column if not exists config jsonb;
alter table settings add column if not exists updated_at timestamptz not null default now();

-- Attendance
alter table attendance add column if not exists user_id uuid references users(id) on delete cascade;
alter table attendance add column if not exists site_id uuid references sites(id) on delete cascade;
alter table attendance add column if not exists company_id uuid references companies(id) on delete cascade;
alter table attendance add column if not exists action text;
alter table attendance add column if not exists timestamp timestamptz not null default now();
alter table attendance add column if not exists latitude numeric;
alter table attendance add column if not exists longitude numeric;
alter table attendance add column if not exists accuracy numeric;
alter table attendance add column if not exists email text;
alter table attendance add column if not exists updated_at timestamptz not null default now();

-- Tasks
alter table tasks add column if not exists site_id uuid references sites(id) on delete cascade;
alter table tasks add column if not exists company_id uuid references companies(id) on delete cascade;
alter table tasks add column if not exists assigned_to uuid references users(id) on delete cascade;
alter table tasks add column if not exists status text;
alter table tasks add column if not exists description text;
alter table tasks add column if not exists created_at timestamptz not null default now();
alter table tasks add column if not exists updated_at timestamptz not null default now();

-- Notices
alter table notices add column if not exists site_id uuid references sites(id) on delete cascade;
alter table notices add column if not exists company_id uuid references companies(id) on delete cascade;
alter table notices add column if not exists title text;
alter table notices add column if not exists body text;
alter table notices add column if not exists attachments jsonb;
alter table notices add column if not exists created_at timestamptz not null default now();
alter table notices add column if not exists updated_at timestamptz not null default now();

-- Deliveries
alter table deliveries add column if not exists site_id uuid references sites(id) on delete cascade;
alter table deliveries add column if not exists company_id uuid references companies(id) on delete cascade;
alter table deliveries add column if not exists delivered_by uuid references users(id) on delete cascade;
alter table deliveries add column if not exists proof_photos jsonb;
alter table deliveries add column if not exists created_at timestamptz not null default now();
alter table deliveries add column if not exists updated_at timestamptz not null default now();

-- RAMS
alter table rams add column if not exists site_id uuid references sites(id) on delete cascade;
alter table rams add column if not exists company_id uuid references companies(id) on delete cascade;
alter table rams add column if not exists type text;
alter table rams add column if not exists file_url text;
alter table rams add column if not exists version text;
alter table rams add column if not exists created_at timestamptz not null default now();
alter table rams add column if not exists updated_at timestamptz not null default now();

-- Briefings
alter table briefings add column if not exists company_id uuid references companies(id) on delete cascade;
alter table briefings add column if not exists title text;
alter table briefings add column if not exists body text;
alter table briefings add column if not exists created_at timestamptz not null default now();
alter table briefings add column if not exists updated_at timestamptz not null default now();

-- COSHH
alter table coshh add column if not exists company_id uuid references companies(id) on delete cascade;
alter table coshh add column if not exists title text;
alter table coshh add column if not exists body text;
alter table coshh add column if not exists created_at timestamptz not null default now();
alter table coshh add column if not exists updated_at timestamptz not null default now();

-- Site Rules
alter table site_rules add column if not exists company_id uuid references companies(id) on delete cascade;
alter table site_rules add column if not exists title text;
alter table site_rules add column if not exists body text;
alter table site_rules add column if not exists created_at timestamptz not null default now();
alter table site_rules add column if not exists updated_at timestamptz not null default now();

-- Safety Alerts
alter table safety_alerts add column if not exists company_id uuid references companies(id) on delete cascade;
alter table safety_alerts add column if not exists title text;
alter table safety_alerts add column if not exists body text;
alter table safety_alerts add column if not exists created_at timestamptz not null default now();
alter table safety_alerts add column if not exists updated_at timestamptz not null default now();

-- Certifications
alter table certifications add column if not exists profile_id uuid;
alter table certifications add column if not exists user_id uuid references users(id) on delete cascade;
alter table certifications add column if not exists type text;
alter table certifications add column if not exists issued_at timestamptz;
alter table certifications add column if not exists expires_at timestamptz;
alter table certifications add column if not exists updated_at timestamptz not null default now();

-- Training
alter table training add column if not exists profile_id uuid;
alter table training add column if not exists user_id uuid references users(id) on delete cascade;
alter table training add column if not exists type text;
alter table training add column if not exists completed_at timestamptz;
alter table training add column if not exists updated_at timestamptz not null default now();

-- User Profile Data
alter table user_profile_data add column if not exists user_id uuid references users(id) on delete cascade;
alter table user_profile_data add column if not exists address text;
alter table user_profile_data add column if not exists town text;
alter table user_profile_data add column if not exists postcode text;
alter table user_profile_data add column if not exists date_of_birth text;
alter table user_profile_data add column if not exists job_title text;
alter table user_profile_data add column if not exists emergency_contact_name text;
alter table user_profile_data add column if not exists emergency_contact_phone text;
alter table user_profile_data add column if not exists national_insurance text;
alter table user_profile_data add column if not exists utr text;
alter table user_profile_data add column if not exists updated_at timestamptz not null default now();

-- Assigned Operatives
alter table assigned_operatives add column if not exists site_id uuid references sites(id) on delete cascade;
alter table assigned_operatives add column if not exists user_id uuid references users(id) on delete cascade;
alter table assigned_operatives add column if not exists assigned_at timestamptz;
alter table assigned_operatives add column if not exists updated_at timestamptz not null default now();
