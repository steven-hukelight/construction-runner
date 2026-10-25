-- Supervisor attendance alerts.
--
-- Every check-in, check-out and automatic sign-out lands in one outbox
-- (attendance_events) via a trigger on public.attendance, whichever path wrote
-- the row: POST /api/attendance, the geofence RPC, perform_attendance_fallback
-- or a resumed session. The trigger then asks the web app to dispatch, and a
-- one-minute pg_cron sweep retries anything left over and drives summaries.
--
-- Per-person settings live in users.notification_preferences -> 'attendance'
-- (off unless the person turns them on).

alter table public.users
  add column if not exists notification_preferences jsonb not null default '{}'::jsonb;

create table if not exists public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  attendance_id text not null,
  company_id text,
  site_id text not null,
  operative_id uuid,
  event text not null check (event in ('check_in', 'check_out', 'auto_sign_out')),
  occurred_at timestamptz not null,
  signed_in_at timestamptz,
  reason text,
  created_at timestamptz not null default now(),
  dispatched_at timestamptz,
  constraint attendance_events_once unique (attendance_id, event, occurred_at)
);

create index if not exists idx_attendance_events_pending
  on public.attendance_events (occurred_at)
  where dispatched_at is null;

create index if not exists idx_attendance_events_company_occurred
  on public.attendance_events (company_id, occurred_at desc);

alter table public.attendance_events enable row level security;

revoke all on table public.attendance_events from anon, authenticated;
grant select on table public.attendance_events to service_role;

-- One in-app row per person per alert or summary.
create unique index if not exists idx_notifications_attendance_alert_dedupe
  on public.notifications (user_id, (data ->> 'event_key'))
  where topic = 'attendance_alerts' and (data ->> 'event_key') is not null;

-- Claim undispatched events so two concurrent dispatch runs never send the same one.
create or replace function public.claim_attendance_events(p_limit integer default 100)
returns setof public.attendance_events
language sql
security definer
set search_path = public
as $$
  update public.attendance_events e
  set dispatched_at = clock_timestamp()
  where e.id in (
    select p.id
    from public.attendance_events p
    where p.dispatched_at is null
    order by p.occurred_at
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    for update skip locked
  )
  returning e.*;
$$;

revoke all on function public.claim_attendance_events(integer) from public, anon, authenticated;
grant execute on function public.claim_attendance_events(integer) to service_role;

-- POST to the dispatch route. The bearer secret lives in vault (attendance_alerts_secret)
-- and in the app's ATTENDANCE_ALERTS_SECRET env var.
create or replace function public.kick_attendance_alert_dispatch()
returns void
language plpgsql
security definer
set search_path = public, extensions, vault, net
as $$
declare
  secret text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'attendance_alerts_secret'
  limit 1;

  if secret is null or btrim(secret) = '' then
    raise log '[ATTENDANCE-ALERTS] kick skipped: vault secret attendance_alerts_secret not set';
    return;
  end if;

  perform net.http_post(
    url := 'https://www.construction-runner.com/api/maintenance/dispatch-attendance-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
exception when others then
  raise log '[ATTENDANCE-ALERTS] kick failed: %', sqlerrm;
end;
$$;

revoke all on function public.kick_attendance_alert_dispatch() from public, anon, authenticated;

create or replace function public.attendance_capture_alert_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event text;
  v_at timestamptz;
  v_signed_in_at timestamptz;
  v_site text := nullif(btrim(coalesce(new.site_id, '')), '');
  v_sign_in_site text;
  v_company text;
  v_auto boolean := coalesce(new.auto_sign_out, false);
  v_inserted integer;
begin
  begin
    if tg_op = 'INSERT' then
      if public._attendance_action_is_sign_in(new.action) then
        v_event := 'check_in';
        v_at := coalesce(new."timestamp", new.created_at, clock_timestamp());
      elsif public._attendance_action_is_sign_out(new.action) then
        v_event := case when v_auto then 'auto_sign_out' else 'check_out' end;
        v_at := coalesce(case when v_auto then new.exit_time end, new.sign_out_time, new."timestamp", clock_timestamp());
        select coalesce(a."timestamp", a.created_at), nullif(btrim(coalesce(a.site_id, '')), '')
        into v_signed_in_at, v_sign_in_site
        from public.attendance a
        where a.user_id = new.user_id
          and a.id is distinct from new.id
          and public._attendance_action_is_sign_in(a.action)
          and coalesce(a."timestamp", a.created_at) <= coalesce(new."timestamp", clock_timestamp())
        order by a."timestamp" desc nulls last
        limit 1;
        v_site := coalesce(v_site, v_sign_in_site);
      else
        return new;
      end if;
    else
      if public._attendance_action_is_sign_in(new.action)
         and not public._attendance_action_is_sign_in(old.action) then
        v_event := 'check_in';
        v_at := coalesce(new.last_location_timestamp, clock_timestamp());
      elsif public._attendance_action_is_sign_out(new.action)
            and not public._attendance_action_is_sign_out(old.action) then
        v_event := case when v_auto then 'auto_sign_out' else 'check_out' end;
        v_at := coalesce(case when v_auto then new.exit_time end, new.sign_out_time, clock_timestamp());
        v_signed_in_at := coalesce(new."timestamp", new.created_at);
      else
        return new;
      end if;
    end if;

    if v_site is null then
      return new;
    end if;

    select s.company_id into v_company from public.sites s where s.id = v_site;
    v_company := coalesce(v_company, nullif(btrim(coalesce(new.company_id, '')), ''));

    insert into public.attendance_events
      (attendance_id, company_id, site_id, operative_id, event, occurred_at, signed_in_at, reason)
    values
      (new.id::text, v_company, v_site, new.user_id, v_event, v_at, v_signed_in_at,
       case when v_event = 'check_in' then null else new.auto_sign_out_reason end)
    on conflict on constraint attendance_events_once do nothing;
    get diagnostics v_inserted = row_count;

    if v_inserted > 0 and exists (
      select 1
      from public.users u
      where u.company_id = v_company
        and u.notification_preferences -> 'attendance' ->> 'enabled' = 'true'
        and coalesce(u.notification_preferences -> 'attendance' ->> 'frequency', 'instant') = 'instant'
    ) then
      perform public.kick_attendance_alert_dispatch();
    end if;
  exception when others then
    raise log '[ATTENDANCE-ALERTS] capture failed attendance_id=% err=%', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.attendance_capture_alert_event() from public, anon, authenticated;

drop trigger if exists attendance_alert_event_insert on public.attendance;
create trigger attendance_alert_event_insert
  after insert on public.attendance
  for each row
  execute function public.attendance_capture_alert_event();

drop trigger if exists attendance_alert_event_action_change on public.attendance;
create trigger attendance_alert_event_action_change
  after update of action on public.attendance
  for each row
  when (old.action is distinct from new.action)
  execute function public.attendance_capture_alert_event();

-- Every minute: retry pending events, and let summaries run when someone uses them.
create or replace function public.attendance_alerts_sweep()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.attendance_events where dispatched_at is null)
     or exists (
       select 1
       from public.users u
       where u.notification_preferences -> 'attendance' ->> 'enabled' = 'true'
         and u.notification_preferences -> 'attendance' ->> 'frequency' in ('hourly', 'daily')
     ) then
    perform public.kick_attendance_alert_dispatch();
  end if;
end;
$$;

revoke all on function public.attendance_alerts_sweep() from public, anon, authenticated;

select cron.schedule(
  'attendance_alerts_sweep',
  '* * * * *',
  $$select public.attendance_alerts_sweep();$$
);

select cron.schedule(
  'attendance_alerts_retention',
  '30 3 * * *',
  $$delete from public.attendance_events where created_at < now() - interval '90 days';
    delete from public.notifications where topic = 'attendance_alerts' and created_at < now() - interval '90 days';$$
);
