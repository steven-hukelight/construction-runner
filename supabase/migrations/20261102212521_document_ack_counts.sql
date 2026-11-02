-- Acknowledgement counts per RAMS / briefing for one company. service_role only (Next.js admin API).
create or replace function public.rams_ack_counts(p_company_id text)
returns table (
  rams_id text,
  ack_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select a.rams_id, count(*)
  from public.rams_acknowledgements a
  join public.rams r on r.id = a.rams_id
  where r.company_id = p_company_id
  group by a.rams_id;
$$;

revoke all on function public.rams_ack_counts(text) from public;
grant execute on function public.rams_ack_counts(text) to service_role;

create or replace function public.briefing_ack_counts(p_company_id text)
returns table (
  briefing_id uuid,
  ack_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select a.briefing_id, count(*)
  from public.briefing_acknowledgements a
  join public.briefings b on b.id = a.briefing_id
  where b.company_id = p_company_id
  group by a.briefing_id;
$$;

revoke all on function public.briefing_ack_counts(text) from public;
grant execute on function public.briefing_ack_counts(text) to service_role;
