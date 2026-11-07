-- Codzienne dociąganie surowego tętna Oury do archiwum na VPS (sparky-worker, handler archive_oura_hr).
-- Okno 3 dni zakrywa opóźnione synchronizacje pierścienia; zapis w archiwum jest idempotentny.
-- 04:10 UTC = 05:10 czasu polskiego, po backupach (03:15/03:45) i przed zadaniami DTMS (04:30 CET).
select cron.schedule(
  'archive-oura-hr-daily',
  '10 4 * * *',
  $cron$
    select pgmq.send(
      'sparky_jobs',
      jsonb_build_object(
        'type', 'archive_oura_hr',
        'payload', jsonb_build_object('user_id', user_id, 'days_back', 3)
      )
    )
    from public.user_settings
    where oura_token is not null
  $cron$
);
