-- Sync bankowy (bank-sync) 3 razy dziennie: 05:15, 11:15, 17:15 UTC.
-- PSD2 limituje odczyty bez obecnosci uzytkownika (ok. 4 na dobe na rachunek), wiec nie czesciej.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bank-sync') THEN
    PERFORM cron.schedule(
      'bank-sync',
      '15 5,11,17 * * *',
      $cmd$
        SELECT net.http_post(
          url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/bank-sync',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vanguard_cron_service_role_key' LIMIT 1)
          ),
          body := '{"action":"sync"}'::jsonb
        );
      $cmd$
    );
  END IF;
END;
$$;
