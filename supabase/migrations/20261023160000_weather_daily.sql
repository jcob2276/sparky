-- Dzienna pogoda w lokalizacji domu (Europe/Warsaw, Open-Meteo). Zasila silnik korelacji (nocny job
-- vanguard-nightly: _shared/weatherSync.ts). Zapis tylko service_role; uzytkownik czyta swoje wiersze.
create table if not exists public.weather_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  temp_mean numeric(5,1),
  temp_max numeric(5,1),
  temp_min numeric(5,1),
  humidity_mean numeric(5,1),
  precip_mm numeric(6,1),
  sunshine_h numeric(4,1),
  computed_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.weather_daily enable row level security;

drop policy if exists "Users read own weather daily" on public.weather_daily;
create policy "Users read own weather daily"
  on public.weather_daily
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.weather_daily is
  'Dzienna pogoda z Open-Meteo dla home_lat/home_lng (user_settings). Zapis: _shared/weatherSync.ts (service_role). Konsument: odkrywanie korelacji (pogoda -> sen, nastroj, trening).';
