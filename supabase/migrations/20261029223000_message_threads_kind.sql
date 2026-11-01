-- Site channel vs private (direct) threads. One live site channel per company+site.
alter table public.message_threads
  add column if not exists kind text;

update public.message_threads
set kind = 'direct'
where kind is null;

alter table public.message_threads
  alter column kind set default 'direct';

alter table public.message_threads
  alter column kind set not null;

alter table public.message_threads
  drop constraint if exists message_threads_kind_check;

alter table public.message_threads
  add constraint message_threads_kind_check
  check (kind in ('direct', 'site'));

create unique index if not exists message_threads_one_site_channel
  on public.message_threads (company_id, site_id)
  where kind = 'site'
    and site_id is not null
    and coalesce(archived, false) = false;
