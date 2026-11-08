-- Stage 1 of site access: competence that stays checked.
-- A worker's competency card carries a CSCS level and a supervisor check. RAMS and tasks
-- can list the cards and tickets their work needs. Every read and write of the new table
-- goes through the admin API with the service role.

alter table public.pre_induction_competency_card
  add column if not exists card_level text,
  add column if not exists checked_at timestamptz,
  add column if not exists checked_by uuid references public.users(id) on delete set null;

comment on column public.pre_induction_competency_card.card_level is
  'CSCS card colour, for example Gold. Null for other card types.';
comment on column public.pre_induction_competency_card.checked_at is
  'When a supervisor looked at the card and confirmed the details. Cleared whenever the details change.';

create index if not exists idx_pre_induction_competency_card_number
  on public.pre_induction_competency_card (upper(regexp_replace(card_number, '\s', '', 'g')))
  where coalesce(card_number, '') <> '';

-- Workers save their own card straight from the phone, so the check fields are guarded here:
-- only the service role (office API) may set them, and any change to the card clears them.
create or replace function public.competency_card_guard_check()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  caller text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
begin
  if caller in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.checked_at := null;
      new.checked_by := null;
    else
      new.checked_at := old.checked_at;
      new.checked_by := old.checked_by;
    end if;
  end if;

  if tg_op = 'UPDATE'
     and (new.card_type, new.card_number, new.expiry, new.card_level, new.file_url)
         is distinct from (old.card_type, old.card_number, old.expiry, old.card_level, old.file_url)
     and new.checked_at is not distinct from old.checked_at then
    new.checked_at := null;
    new.checked_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_competency_card_guard_check on public.pre_induction_competency_card;
create trigger trg_competency_card_guard_check
  before insert or update on public.pre_induction_competency_card
  for each row execute function public.competency_card_guard_check();

create table public.competence_requirements (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  subject_type text not null check (subject_type in ('rams', 'task')),
  subject_id text not null,
  kind text not null check (kind in ('card', 'ticket')),
  code text not null check (char_length(code) between 1 and 80),
  level text check (level is null or char_length(level) between 1 and 40),
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null
);

comment on table public.competence_requirements is
  'Cards and tickets a RAMS or task needs, for example CSCS Gold or IPAF. Used to show who on site lacks them.';

create unique index competence_requirements_unique
  on public.competence_requirements (subject_type, subject_id, kind, lower(code), coalesce(lower(level), ''));
create index idx_competence_requirements_company on public.competence_requirements (company_id);

alter table public.competence_requirements enable row level security;
revoke all on public.competence_requirements from anon, authenticated;
grant select, insert, update, delete on public.competence_requirements to service_role;
