-- ============================================================
-- AUTO-SYNC FOR INVESTMENTS: 100% Autonomous 24/7 Crons
-- Automatically pulls fresh data from primary sources (KNF, NBP, Yahoo)
-- without any user intervention.
-- ============================================================

DO $$
BEGIN
  -- 1. KNF Shorts: Mon-Fri after GPW session (17:35 Warsaw time = 15:35 UTC)
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-knf-shorts') THEN
    PERFORM cron.schedule(
      'sync-knf-shorts',
      '35 15 * * 1-5',
      $cmd$
        SELECT net.http_post(
          url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=knf_shorts',
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

  -- 2. Quotes & NBP FX: Every 15 min during market hours (Mon-Fri 8:00 - 22:00 Warsaw = 6:00 - 20:00 UTC)
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-market-quotes') THEN
    PERFORM cron.schedule(
      'sync-market-quotes',
      '*/15 6-20 * * 1-5',
      $cmd$
        SELECT net.http_post(
          url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=quotes',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', 'sb_publishable_hk5dxBIqAL5v3XkM-s55-w_6n27h1-r',
            'Authorization', 'Bearer ' || COALESCE(
              (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vanguard_cron_service_role_key' LIMIT 1),
              'sb_publishable_hk5dxBIqAL5v3XkM-s55-w_6n27h1-r'
            )
          ),
          body := jsonb_build_object('tickers', jsonb_build_array('CDR.WA', 'MRVL', 'JEDI.DE', 'SXR8.DE', 'NVDA', 'NBIS', 'BE', 'XTB.WA'))
        );
      $cmd$
    );
  END IF;
END;
$$;
