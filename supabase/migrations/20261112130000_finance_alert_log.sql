-- Dziennik wysłanych powiadomień finansowych: ten sam alert (np. przekroczona koperta) idzie raz na miesiąc.
-- Zapisuje wyłącznie edge function vanguard-push-reminder (service role).
create table if not exists public.finance_alert_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_key text not null check (length(alert_key) between 1 and 200),
  sent_at timestamptz not null default now(),
  primary key (user_id, alert_key)
);

alter table public.finance_alert_log enable row level security;
revoke all on public.finance_alert_log from anon, authenticated;
grant all on public.finance_alert_log to service_role;
