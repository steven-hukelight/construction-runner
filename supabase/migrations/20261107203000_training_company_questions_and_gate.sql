-- Training extras: a company can write its own five questions for any module,
-- create its own modules, and require a module to be passed before sign-in.
-- Every read and write goes through the admin API with the service role.

alter table public.training_modules
  add column if not exists company_id text;

comment on column public.training_modules.company_id is
  'Null for the shared catalogue. Set when a company created the module; only that company sees it.';

create index if not exists idx_training_modules_company on public.training_modules (company_id) where company_id is not null;

create table public.company_training_questions (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  module_id text not null references public.training_modules(id) on delete cascade,
  sort_order integer not null,
  stem text not null check (char_length(stem) between 1 and 300),
  options jsonb not null,
  correct_index smallint not null check (correct_index between 0 and 2),
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null,
  constraint company_training_questions_three_options check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 3),
  constraint company_training_questions_order unique (company_id, module_id, sort_order)
);

comment on table public.company_training_questions is
  'A company''s own quiz for a module. When present, it replaces the shared questions for that company''s people.';

alter table public.company_training_modules
  add column if not exists required_for_sign_in boolean not null default false;

comment on column public.company_training_modules.required_for_sign_in is
  'Sign-in is refused until the person has passed this module, and again once it is due.';

-- A module saved on the phone can be watched and answered with no signal. The answers
-- sync later under the phone's event id, so a retried sync cannot record them twice.
alter table public.training_attempts
  add column if not exists client_event_id uuid;

create unique index if not exists training_attempts_client_event_id_key
  on public.training_attempts (client_event_id) where client_event_id is not null;

alter table public.company_training_questions enable row level security;
revoke all on public.company_training_questions from anon, authenticated;
grant select, insert, update, delete on public.company_training_questions to service_role;
