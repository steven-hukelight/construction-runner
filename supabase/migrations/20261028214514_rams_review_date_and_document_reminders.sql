-- RAMS review-by date (office compliance) and per-person document remind log.
-- Existing rams grants stay. document_reminders is admin-API only.

alter table public.rams
  add column if not exists review_date date;

comment on column public.rams.review_date is
  'Office review-by date. Does not change acknowledgement or remind eligibility.';

create table if not exists public.document_reminders (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  document_kind text not null check (document_kind in ('briefing', 'rams')),
  document_id text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  sent_at timestamptz not null default now(),
  sent_by uuid references public.users(id) on delete set null
);

create index if not exists idx_document_reminders_lookup
  on public.document_reminders (document_kind, document_id, user_id, sent_at desc);

create index if not exists idx_document_reminders_company
  on public.document_reminders (company_id, sent_at desc);

alter table public.document_reminders enable row level security;

revoke all on public.document_reminders from anon, authenticated;
grant select, insert on public.document_reminders to service_role;
