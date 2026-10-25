-- Notifications sent before the in-app notification centre existed were never
-- shown in-app. Mark them read so the first unread badge only counts new ones.
-- Fixed cutoff keeps the migration deterministic if it is ever replayed.

update public.notifications
set read_at = now()
where read_at is null
  and created_at < timestamptz '2026-10-25 00:00:00+00';
