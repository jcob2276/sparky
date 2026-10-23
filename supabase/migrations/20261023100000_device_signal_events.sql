-- Sygnaly z telefonu (APK): lekkie zdarzenia z kolektorow natywnych (bateria, siec, kroki, ekran,
-- DND, powiadomienia - tylko liczniki per aplikacja, bez tresci, audio, swiatlo, ruch mobilny).
-- Natywna kolejka offline wysyla paczki; client_id (ts-seq) czyni retry idempotentnym.
create table if not exists public.device_signal_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  ts timestamptz not null,
  kind text not null check (kind in (
    'battery','network','steps','screen','unlock','dnd','notif','audio','light','traffic'
  )),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint device_signal_events_client_unique unique (user_id, client_id)
);

create index if not exists device_signal_events_user_ts_idx
  on public.device_signal_events (user_id, ts desc);
create index if not exists device_signal_events_user_kind_ts_idx
  on public.device_signal_events (user_id, kind, ts desc);

alter table public.device_signal_events enable row level security;

drop policy if exists "Users manage own device signals" on public.device_signal_events;
create policy "Users manage own device signals"
  on public.device_signal_events
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.device_signal_events is
  'Zdarzenia z kolektorow telefonu (APK). payload bez tresci prywatnych: SSID zostaje na urzadzeniu (tylko etykieta home/work/other), powiadomienia to liczniki per pakiet.';

-- Retencja: surowe zdarzenia 120 dni.
select cron.unschedule('device-signal-events-retention')
where exists (select 1 from cron.job where jobname = 'device-signal-events-retention');
select cron.schedule('device-signal-events-retention', '17 3 * * *',
  $$delete from public.device_signal_events where ts < now() - interval '120 days';$$);
