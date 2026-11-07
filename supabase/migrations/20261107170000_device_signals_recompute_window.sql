-- Zdarzenia z telefonu trafiają do device_signal_events z opóźnieniem (kolejka offline), a dzienny
-- cron przeliczał tylko wczoraj i dziś. Dni, których zdarzenia dotarły później, zostawały zamrożone
-- ze stanem sprzed uploadu (event_count = 0, unlocks = 0, screen_on_min = 720 z kapsuły 12 h).
-- Przeliczamy okno 7 dni; compute_device_signals_daily jest idempotentny (upsert po user_id, date).
create or replace function public.cron_refresh_device_signals_daily()
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r record;
  d integer;
  v_today date := (now() at time zone 'Europe/Warsaw')::date;
begin
  for r in
    select distinct user_id from public.device_signal_events where ts >= now() - interval '7 days'
  loop
    for d in 0..6 loop
      perform public.compute_device_signals_daily(r.user_id, v_today - d);
    end loop;
  end loop;
end;
$function$;

-- Jednorazowe naprawienie dni zamrożonych przed tą zmianą (od pierwszego zdarzenia do dziś).
do $$
declare
  r record;
  v_day date;
  v_today date := (now() at time zone 'Europe/Warsaw')::date;
begin
  for r in
    select user_id, (min(ts) at time zone 'Europe/Warsaw')::date as first_day
    from public.device_signal_events group by user_id
  loop
    for v_day in select generate_series(r.first_day, v_today, interval '1 day')::date loop
      perform public.compute_device_signals_daily(r.user_id, v_day);
    end loop;
  end loop;
end
$$;
