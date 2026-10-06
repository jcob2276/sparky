SELECT cron.schedule('sync-house-disclosures', '*/10 * * * *', $command$
  SELECT net.http_post(
    url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=house_disclosures',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (
      SELECT decrypted_secret FROM vault.decrypted_secrets
      WHERE name='vanguard_cron_service_role_key' LIMIT 1
    )),
    body := '{"limit":5}'::jsonb,
    timeout_milliseconds := 60000
  );
$command$);
