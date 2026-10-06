-- Persist verified quotes instead of discarding the scheduled refresh response.
DO $migration$
DECLARE quote_job bigint;
BEGIN
  SELECT jobid INTO quote_job FROM cron.job WHERE jobname = 'sync-market-quotes';
  IF quote_job IS NULL THEN RAISE EXCEPTION 'Missing sync-market-quotes schedule'; END IF;
  PERFORM cron.alter_job(quote_job, command := $command$
    SELECT net.http_post(
      url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=quotes',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name = 'vanguard_cron_service_role_key' LIMIT 1
        )
      ),
      body := jsonb_build_object(
        'persist', true, 'range', '5d',
        'tickers', jsonb_build_array(
          'CDR.WA', 'MRVL', 'JEDI.DE', 'SXR8.DE', 'NVDA', 'NBIS', 'BE',
          'XTB.WA', 'AMZN', 'VST', 'CSPX.L'
        )
      ),
      timeout_milliseconds := 30000
    );
  $command$);
END;
$migration$;
