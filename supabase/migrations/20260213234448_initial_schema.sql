-- Create companies table (IF NOT EXISTS for idempotency when tables already exist)
create table if not exists companies (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	created_at timestamp with time zone default now()
);

-- Create users table
create table if not exists users (
	id uuid primary key default gen_random_uuid(),
	email text not null,
	created_at timestamp with time zone default now()
);

-- Create user_company_roles table
create table if not exists user_company_roles (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references users(id),
	company_id uuid references companies(id),
	role text not null
);

-- Create sites table
create table if not exists sites (
	id uuid primary key default gen_random_uuid(),
	company_id uuid references companies(id),
	name text not null,
	created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS) on all tables
alter table companies enable row level security;
alter table users enable row level security;
alter table user_company_roles enable row level security;
alter table sites enable row level security;

-- Add placeholder RLS policies (DROP IF EXISTS first for idempotency)
drop policy if exists "placeholder" on companies;
create policy "placeholder" on companies for select using (true);
drop policy if exists "placeholder" on users;
create policy "placeholder" on users for select using (true);
drop policy if exists "placeholder" on user_company_roles;
create policy "placeholder" on user_company_roles for select using (true);
drop policy if exists "placeholder" on sites;
create policy "placeholder" on sites for select using (true);
