-- Surowe oura_heartrate jest przycinane po 14 dniach (sync/timeseries.ts), więc historia dziennego tętna
-- ginęła. Dzienny rollup (średnia, p90, średnia z próbek "rest") jest liczony przed przycięciem
-- i zasila silnik korelacji; surowe próbki nadal nie są trzymane dłużej.
create table public.oura_hr_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  day_avg_bpm numeric(5,1),
  day_p90_bpm numeric(5,1),
  day_rest_bpm numeric(5,1),
  samples integer not null default 0 check (samples >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.oura_hr_daily enable row level security;
create policy oura_hr_daily_owner_read on public.oura_hr_daily
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.oura_hr_daily to authenticated;
grant all on public.oura_hr_daily to service_role;

comment on table public.oura_hr_daily is
  'Dzienny rollup tętna Oury (Europe/Warsaw): day_* liczone z próbek poza snem, day_rest_bpm z próbek source=rest.';
