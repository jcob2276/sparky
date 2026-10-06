do $schedule$
declare existing_job bigint;
declare request_command text := $request$
select net.http_post(
  url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync-insider-trades?limit=60&days=3',
  headers := jsonb_build_object('Authorization', 'Bearer ' ||
    (select decrypted_secret from vault.decrypted_secrets where name = 'vanguard_cron_service_role_key' limit 1),
    'Content-Type', 'application/json'),
  body := '{}'::jsonb,
  timeout_milliseconds := 120000
);
$request$;
begin
  select jobid into existing_job from cron.job where jobname = 'sync-insider-trades';
  if existing_job is null then
    perform cron.schedule('sync-insider-trades', '*/5 * * * *', request_command);
  else
    perform cron.alter_job(existing_job, schedule := '*/5 * * * *', command := request_command, active := true);
  end if;
end;
$schedule$;
