-- ============================================================
-- AUTO-SYNC FOR HOUSE & INSIDER TRADES
-- Autonomous daily sync from public GitHub / open records
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-insider-trades') THEN
    PERFORM cron.schedule(
      'sync-insider-trades',
      '0 7 * * *', -- Everyday at 7:00 UTC (9:00 Warsaw)
      $cmd$
        SELECT net.http_post(
          url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync-insider-trades?limit=500',
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
