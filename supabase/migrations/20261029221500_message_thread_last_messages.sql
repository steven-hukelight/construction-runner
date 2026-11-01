-- Last-message preview for inbox rows. service_role only (Next.js admin API).
create index if not exists idx_messages_thread_thread_id_created_at
  on public.messages_thread (thread_id, created_at desc);

create or replace function public.message_thread_last_messages(p_thread_ids uuid[])
returns table (
  thread_id uuid,
  body text,
  created_at timestamptz,
  sender_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (m.thread_id)
    m.thread_id,
    m.body,
    m.created_at,
    m.sender_id
  from public.messages_thread m
  where m.thread_id = any (p_thread_ids)
  order by m.thread_id, m.created_at desc;
$$;

revoke all on function public.message_thread_last_messages(uuid[]) from public;
grant execute on function public.message_thread_last_messages(uuid[]) to service_role;
