-- Dzienny agregat sygnalow z telefonu (Europe/Warsaw): UI i Oracle czytaja te tabele, nie surowe
-- zdarzenia device_signal_events. Wiersz D = doba D (00:00-24:00 Warsaw) + noc konczaca sie rano D
-- (sen telefonu liczony z okna 18:00 D-1 .. 14:00 D). Liczy go compute_device_signals_daily,
-- nocny cron odswieza ostatnie 2 doby, a RPC refresh_device_signals_daily - biezacy dzien na zadanie.
create table if not exists public.device_signals_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  event_count integer not null default 0,
  steps integer not null default 0,
  unlocks integer not null default 0,
  screen_on_min integer not null default 0,
  first_screen_on timestamptz,
  last_screen_off timestamptz,
  -- sen z telefonu: najdluzsze okno ekranu wylaczonego (>=3 h, przerwy <15 min scalane) w nocy
  phone_sleep_start timestamptz,
  phone_sleep_end timestamptz,
  phone_sleep_min integer,
  phone_sleep_steps integer,
  phone_sleep_charging boolean,
  phone_sleep_batt_start integer,
  phone_sleep_batt_end integer,
  phone_sleep_confidence text check (phone_sleep_confidence in ('high','medium','low')),
  -- wieczor przed snem
  screen_after_22_min integer not null default 0,
  evening_lux_avg integer,
  evening_brightness_avg integer,
  evening_light_samples integer not null default 0,
  -- przerwania
  notif_total integer not null default 0,
  notif_per_hour numeric(6,2),
  notif_awake_hours numeric(5,2),
  notif_top jsonb not null default '{}'::jsonb,
  -- siec / miejsca z Wi-Fi (dziala bez GPS)
  home_wifi_min integer not null default 0,
  work_wifi_min integer not null default 0,
  other_wifi_min integer not null default 0,
  cellular_min integer not null default 0,
  offline_min integer not null default 0,
  dnd_min integer not null default 0,
  headphones_min integer not null default 0,
  charging_min integer not null default 0,
  battery_min integer,
  avg_lux integer,
  mobile_mb integer not null default 0,
  total_mb integer not null default 0,
  computed_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.device_signals_daily enable row level security;

drop policy if exists "Users read own device signals daily" on public.device_signals_daily;
create policy "Users read own device signals daily"
  on public.device_signals_daily
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.device_signals_daily is
  'Dzienny agregat z device_signal_events (Europe/Warsaw). Zapis tylko przez compute_device_signals_daily (cron / RPC refresh_device_signals_daily). Konsumenci: karta Sygnaly telefonu na /oura Dzis, Oracle.';

create or replace function public.compute_device_signals_daily(p_user_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_start timestamptz := (p_date::timestamp at time zone 'Europe/Warsaw');
  v_end timestamptz := ((p_date + 1)::timestamp at time zone 'Europe/Warsaw');
  v_cap timestamptz;
  v_night_from timestamptz := ((p_date - 1)::timestamp + interval '18 hours') at time zone 'Europe/Warsaw';
  v_night_to timestamptz := (p_date::timestamp + interval '14 hours') at time zone 'Europe/Warsaw';
  v_22 timestamptz := ((p_date - 1)::timestamp + interval '22 hours') at time zone 'Europe/Warsaw';
  v_06 timestamptz := (p_date::timestamp + interval '6 hours') at time zone 'Europe/Warsaw';
  v_evening_from timestamptz := ((p_date - 1)::timestamp + interval '20 hours') at time zone 'Europe/Warsaw';
  v_events integer;
  v_steps integer;
  v_unlocks integer;
  v_sleep_start timestamptz;
  v_sleep_end timestamptz;
  v_sleep_steps integer;
  v_sleep_chg boolean;
  v_batt_start integer;
  v_batt_end integer;
  v_conf text;
  v_screen_on integer;
  v_first_on timestamptz;
  v_last_off timestamptz;
  v_after22 integer;
  v_lux integer;
  v_br integer;
  v_light_n integer;
  v_notif integer;
  v_notif_top jsonb;
  v_awake_from timestamptz;
  v_awake_hours numeric;
  v_home integer; v_work integer; v_other integer; v_cell integer; v_none integer;
  v_dnd integer; v_phones integer; v_chg integer;
  v_batt_min integer;
  v_avg_lux integer;
  v_mobile integer; v_total integer;
begin
  v_cap := least(v_end, now());
  if v_cap <= v_start then
    return;
  end if;

  select count(*) into v_events
  from public.device_signal_events
  where user_id = p_user_id and ts >= v_start and ts < v_cap;

  select coalesce(sum((payload->>'d')::numeric), 0)::integer into v_steps
  from public.device_signal_events
  where user_id = p_user_id and kind = 'steps' and ts >= v_start and ts < v_cap;

  select count(*) into v_unlocks
  from public.device_signal_events
  where user_id = p_user_id and kind = 'unlock' and ts >= v_start and ts < v_cap;

  -- Stany (ekran, siec, DND, audio, bateria) jako przedzialy [ts, nastepna zmiana), z ostatnim stanem sprzed polnocy.
  with src as (
    select kind, ts, payload from public.device_signal_events
    where user_id = p_user_id and kind in ('screen','network','dnd','audio','battery')
      and ts >= v_start and ts < v_cap
    union all
    (select distinct on (kind) kind, v_start as ts, payload from public.device_signal_events
     where user_id = p_user_id and kind in ('screen','network','dnd','audio','battery')
       and ts < v_start and ts >= v_start - interval '12 hours'
     order by kind, ts desc)
  ),
  st as (
    select kind, ts,
      least(coalesce(lead(ts) over (partition by kind order by ts), v_cap), ts + interval '12 hours', v_cap) as te,
      payload
    from src
  )
  select
    coalesce(round(sum(extract(epoch from te - ts)) filter (where kind = 'screen' and payload->>'on' = 'true') / 60), 0)::integer,
    coalesce(round(sum(extract(epoch from te - ts)) filter (where kind = 'network' and payload->>'t' = 'wifi' and payload->>'lbl' = 'home') / 60), 0)::integer,
    coalesce(round(sum(extract(epoch from te - ts)) filter (where kind = 'network' and payload->>'t' = 'wifi' and payload->>'lbl' = 'work') / 60), 0)::integer,
    coalesce(round(sum(extract(epoch from te - ts)) filter (where kind = 'network' and payload->>'t' = 'wifi'
      and coalesce(payload->>'lbl', 'other') not in ('home', 'work')) / 60), 0)::integer,
    coalesce(round(sum(extract(epoch from te - ts)) filter (where kind = 'network' and payload->>'t' = 'cell') / 60), 0)::integer,
    coalesce(round(sum(extract(epoch from te - ts)) filter (where kind = 'network' and payload->>'t' = 'none') / 60), 0)::integer,
    coalesce(round(sum(extract(epoch from te - ts)) filter (where kind = 'dnd' and coalesce(payload->>'f', '') not in ('all', 'unknown', '')) / 60), 0)::integer,
    coalesce(round(sum(extract(epoch from te - ts)) filter (where kind = 'audio' and payload->>'out' in ('bt', 'wired')) / 60), 0)::integer,
    coalesce(round(sum(extract(epoch from te - ts)) filter (where kind = 'battery' and payload->>'chg' = 'true') / 60), 0)::integer,
    min(ts) filter (where kind = 'screen' and payload->>'on' = 'true' and ts >= v_start),
    max(ts) filter (where kind = 'screen' and payload->>'on' = 'false' and ts >= v_start)
  into v_screen_on, v_home, v_work, v_other, v_cell, v_none, v_dnd, v_phones, v_chg, v_first_on, v_last_off
  from st;

  select min((payload->>'lvl')::integer) filter (where (payload->>'lvl')::integer > 0)
  into v_batt_min
  from public.device_signal_events
  where user_id = p_user_id and kind = 'battery' and ts >= v_start and ts < v_cap;

  select round(avg((payload->>'lux')::numeric))::integer into v_avg_lux
  from public.device_signal_events
  where user_id = p_user_id and kind = 'light' and ts >= v_start and ts < v_cap;

  select coalesce(round(sum(coalesce((payload->>'mrx')::numeric, 0) + coalesce((payload->>'mtx')::numeric, 0)) / 1048576), 0)::integer,
         coalesce(round(sum(coalesce((payload->>'trx')::numeric, 0) + coalesce((payload->>'ttx')::numeric, 0)) / 1048576), 0)::integer
  into v_mobile, v_total
  from public.device_signal_events
  where user_id = p_user_id and kind = 'traffic' and ts >= v_start and ts < v_cap;

  -- Sen z telefonu: ekran wylaczony, przerwy krotsze niz 15 min scalane, okno zaczyna sie 20:00-04:00.
  with s as (
    select ts, payload->>'on' as on_, lead(ts) over (order by ts) as next_ts
    from public.device_signal_events
    where user_id = p_user_id and kind = 'screen' and ts >= v_night_from and ts < v_night_to
  ),
  gaps as (
    select ts as g_start, next_ts as g_end from s where on_ = 'false' and next_ts is not null
  ),
  flagged as (
    select g_start, g_end,
      case when lag(g_end) over (order by g_start) is null
             or g_start - lag(g_end) over (order by g_start) > interval '15 minutes' then 1 else 0 end as is_new
    from gaps
  ),
  grouped as (
    select g_start, g_end, sum(is_new) over (order by g_start) as gid from flagged
  ),
  islands as (
    select min(g_start) as s_start, max(g_end) as s_end from grouped group by gid
  )
  select s_start, s_end into v_sleep_start, v_sleep_end
  from islands
  where s_end - s_start >= interval '3 hours'
    and s_start >= v_evening_from
    and s_start <= (p_date::timestamp + interval '4 hours') at time zone 'Europe/Warsaw'
  order by s_end - s_start desc
  limit 1;

  if v_sleep_start is not null then
    select coalesce(sum((payload->>'d')::numeric), 0)::integer into v_sleep_steps
    from public.device_signal_events
    where user_id = p_user_id and kind = 'steps' and ts >= v_sleep_start and ts < v_sleep_end;

    select coalesce((payload->>'chg')::boolean, false), (payload->>'lvl')::integer
    into v_sleep_chg, v_batt_start
    from public.device_signal_events
    where user_id = p_user_id and kind = 'battery' and ts <= v_sleep_start
    order by ts desc limit 1;

    select (payload->>'lvl')::integer into v_batt_end
    from public.device_signal_events
    where user_id = p_user_id and kind = 'battery' and ts <= v_sleep_end
    order by ts desc limit 1;

    v_conf := case
      when v_sleep_steps <= 30 and (coalesce(v_sleep_chg, false) or coalesce(v_batt_start - v_batt_end, 0) <= 10) then 'high'
      when v_sleep_steps <= 100 then 'medium'
      else 'low' end;
  end if;

  -- Ekran po 22:00 przed snem (22:00 D-1 .. 06:00 D), clip przedzialow ekranu do okna.
  select coalesce(round(sum(extract(epoch from least(e.te, v_06) - greatest(e.ts, v_22))) / 60), 0)::integer
  into v_after22
  from (
    select ts, least(coalesce(lead(ts) over (order by ts), v_06), ts + interval '12 hours', v_06) as te, payload
    from public.device_signal_events
    where user_id = p_user_id and kind = 'screen' and ts >= v_22 - interval '12 hours' and ts < v_06
  ) e
  where e.payload->>'on' = 'true' and e.te > v_22;

  select round(avg((payload->>'lux')::numeric))::integer, round(avg((payload->>'br')::numeric))::integer, count(*)::integer
  into v_lux, v_br, v_light_n
  from public.device_signal_events
  where user_id = p_user_id and kind = 'light'
    and ts >= v_evening_from and ts < coalesce(v_sleep_start, v_06);

  select coalesce(sum((payload->>'n')::integer), 0)::integer into v_notif
  from public.device_signal_events
  where user_id = p_user_id and kind = 'notif' and ts >= v_start and ts < v_cap;

  select coalesce(jsonb_object_agg(pkg, cnt), '{}'::jsonb) into v_notif_top
  from (
    select kv.key as pkg, sum(kv.value::integer) as cnt
    from public.device_signal_events e, lateral jsonb_each_text(e.payload->'c') kv
    where e.user_id = p_user_id and e.kind = 'notif' and e.ts >= v_start and e.ts < v_cap
    group by kv.key order by cnt desc limit 10
  ) t;

  -- Przerwania na godzine: powiadomienia / godziny po przebudzeniu (sen z telefonu albo 07:00).
  v_awake_from := greatest(v_start, coalesce(case when v_sleep_end >= v_start then v_sleep_end end, v_start + interval '7 hours'));
  v_awake_hours := greatest(extract(epoch from v_cap - v_awake_from) / 3600.0, 0);

  insert into public.device_signals_daily as d (
    user_id, date, event_count, steps, unlocks, screen_on_min, first_screen_on, last_screen_off,
    phone_sleep_start, phone_sleep_end, phone_sleep_min, phone_sleep_steps, phone_sleep_charging,
    phone_sleep_batt_start, phone_sleep_batt_end, phone_sleep_confidence,
    screen_after_22_min, evening_lux_avg, evening_brightness_avg, evening_light_samples,
    notif_total, notif_per_hour, notif_awake_hours, notif_top,
    home_wifi_min, work_wifi_min, other_wifi_min, cellular_min, offline_min, dnd_min, headphones_min,
    charging_min, battery_min, avg_lux, mobile_mb, total_mb, computed_at
  ) values (
    p_user_id, p_date, v_events, v_steps, v_unlocks, v_screen_on, v_first_on, v_last_off,
    v_sleep_start, v_sleep_end,
    case when v_sleep_start is not null then round(extract(epoch from v_sleep_end - v_sleep_start) / 60)::integer end,
    v_sleep_steps, v_sleep_chg, v_batt_start, v_batt_end, v_conf,
    coalesce(v_after22, 0), v_lux, v_br, coalesce(v_light_n, 0),
    v_notif, case when v_awake_hours >= 3 then round(v_notif / v_awake_hours, 2) end,
    case when v_awake_hours >= 3 then round(v_awake_hours, 2) end, v_notif_top,
    v_home, v_work, v_other, v_cell, v_none, v_dnd, v_phones,
    v_chg, v_batt_min, v_avg_lux, v_mobile, v_total, now()
  )
  on conflict (user_id, date) do update set
    event_count = excluded.event_count, steps = excluded.steps, unlocks = excluded.unlocks,
    screen_on_min = excluded.screen_on_min, first_screen_on = excluded.first_screen_on,
    last_screen_off = excluded.last_screen_off, phone_sleep_start = excluded.phone_sleep_start,
    phone_sleep_end = excluded.phone_sleep_end, phone_sleep_min = excluded.phone_sleep_min,
    phone_sleep_steps = excluded.phone_sleep_steps, phone_sleep_charging = excluded.phone_sleep_charging,
    phone_sleep_batt_start = excluded.phone_sleep_batt_start, phone_sleep_batt_end = excluded.phone_sleep_batt_end,
    phone_sleep_confidence = excluded.phone_sleep_confidence, screen_after_22_min = excluded.screen_after_22_min,
    evening_lux_avg = excluded.evening_lux_avg, evening_brightness_avg = excluded.evening_brightness_avg,
    evening_light_samples = excluded.evening_light_samples, notif_total = excluded.notif_total,
    notif_per_hour = excluded.notif_per_hour, notif_awake_hours = excluded.notif_awake_hours,
    notif_top = excluded.notif_top, home_wifi_min = excluded.home_wifi_min, work_wifi_min = excluded.work_wifi_min,
    other_wifi_min = excluded.other_wifi_min, cellular_min = excluded.cellular_min, offline_min = excluded.offline_min,
    dnd_min = excluded.dnd_min, headphones_min = excluded.headphones_min, charging_min = excluded.charging_min,
    battery_min = excluded.battery_min, avg_lux = excluded.avg_lux, mobile_mb = excluded.mobile_mb,
    total_mb = excluded.total_mb, computed_at = excluded.computed_at;
end;
$fn$;

revoke all on function public.compute_device_signals_daily(uuid, date) from public, anon, authenticated;
grant execute on function public.compute_device_signals_daily(uuid, date) to service_role;

-- RPC z UI: odswiezenie wlasnych dni (domyslnie wczoraj i dzis), tylko dla zalogowanego.
create or replace function public.refresh_device_signals_daily(p_days integer default 2)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_today date := (now() at time zone 'Europe/Warsaw')::date;
  v_n integer := least(greatest(coalesce(p_days, 2), 1), 30);
  i integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  for i in 0 .. v_n - 1 loop
    perform public.compute_device_signals_daily(v_uid, v_today - i);
  end loop;
  return v_n;
end;
$fn$;

revoke all on function public.refresh_device_signals_daily(integer) from public, anon;
grant execute on function public.refresh_device_signals_daily(integer) to authenticated, service_role;

-- Noc: przelicz wczoraj i dzis dla uzytkownikow z ostatnimi zdarzeniami (03:40 Warsaw ~ 01:40 UTC zima / 02:40 lato -> 02:10 UTC).
create or replace function public.cron_refresh_device_signals_daily()
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  r record;
  v_today date := (now() at time zone 'Europe/Warsaw')::date;
begin
  for r in
    select distinct user_id from public.device_signal_events where ts >= now() - interval '3 days'
  loop
    perform public.compute_device_signals_daily(r.user_id, v_today - 1);
    perform public.compute_device_signals_daily(r.user_id, v_today);
  end loop;
end;
$fn$;

revoke all on function public.cron_refresh_device_signals_daily() from public, anon, authenticated;
grant execute on function public.cron_refresh_device_signals_daily() to service_role;

select cron.unschedule('device-signals-daily-refresh')
where exists (select 1 from cron.job where jobname = 'device-signals-daily-refresh');
select cron.schedule('device-signals-daily-refresh', '10 2 * * *', $$select public.cron_refresh_device_signals_daily();$$);
