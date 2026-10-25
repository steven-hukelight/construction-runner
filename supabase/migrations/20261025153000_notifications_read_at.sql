-- In-app notification centre: track when each user has read a notification.
-- Rows stay readable only through the service role (admin API routes); the
-- existing grants and the notifications_select_own_or_admin policy are unchanged.

alter table public.notifications
  add column if not exists read_at timestamptz;

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc)
  where user_id is not null;
