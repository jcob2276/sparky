SELECT cron.schedule('sync-sec13f-positions','*/5 * * * *',$job$
  SELECT net.http_post(
    url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=sec_13f',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (
      SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vanguard_cron_service_role_key' LIMIT 1
    )),body := '{"limit":10}'::jsonb,timeout_milliseconds := 90000
  ) WHERE EXISTS (SELECT 1 FROM public.filings WHERE positions_status='pending' AND is_amendment=false);
$job$);
