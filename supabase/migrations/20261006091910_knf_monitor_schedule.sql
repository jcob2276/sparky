do $schedule$
declare existing_job bigint;
declare request_command text := $request$
select net.http_post(
  url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=knf_shorts',
  headers := jsonb_build_object('Authorization', 'Bearer ' ||
    (select decrypted_secret from vault.decrypted_secrets where name = 'vanguard_cron_service_role_key' limit 1),
    'Content-Type', 'application/json'),
  body := '{}'::jsonb,
  timeout_milliseconds := 60000
);
$request$;
begin
  select jobid into existing_job from cron.job where jobname = 'sync-knf-shorts';
  if existing_job is null then
    perform cron.schedule('sync-knf-shorts', '*/30 * * * *', request_command);
  else
    perform cron.alter_job(existing_job, schedule := '*/30 * * * *', command := request_command, active := true);
  end if;
end;
$schedule$;
