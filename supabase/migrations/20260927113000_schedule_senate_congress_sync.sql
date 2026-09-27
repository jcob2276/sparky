-- ============================================================
-- AUTO-SYNC FOR SENATE & CONGRESS TRADES
-- Autonomous daily sync from public GitHub / open records
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-senate-trades') THEN
    PERFORM cron.schedule(
      'sync-senate-trades',
      '30 6 * * *', -- Everyday at 6:30 UTC (8:30 Warsaw)
      $cmd$
        SELECT net.http_post(
          url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=senate',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', 'sb_publishable_hk5dxBIqAL5v3XkM-s55-w_6n27h1-r',
            'Authorization', 'Bearer ' || COALESCE(
              (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vanguard_cron_service_role_key' LIMIT 1),
              'sb_publishable_hk5dxBIqAL5v3XkM-s55-w_6n27h1-r'
            )
          ),
          body := '{}'::jsonb
        );
      $cmd$
    );
  END IF;
END;
$$;
