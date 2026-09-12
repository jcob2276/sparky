-- ============================================================
-- CALENDAR AUTO-SYNC: Google Calendar -> Vanguard co 30 minut.
-- Sync kalendarza do tej palał się wyłącznie ręcznie (przycisk w UI / auto-sync
-- przy otwartej aplikacji), więc wydarzenia z Google znikały z /kalendarz,
-- gdy aplikacja nie była uruchomiona. Oura/Strava mają crony — kalendarz nie.
-- Sekret service-role jest pobierany z vault (wzór: 20260711212750).
-- Idempotentne: nie tworzy joba, jeśli istnieje.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-google-calendar') THEN
    PERFORM cron.schedule(
      'sync-google-calendar',
      '7,37 * * * *',
      $cmd$
        SELECT net.http_post(
          url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=calendar',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vanguard_cron_service_role_key')
          ),
          body := jsonb_build_object('userId', '165ae341-670c-46ce-82dc-434c4dbfcdfd')
        );
      $cmd$
    );
  END IF;
END;
$$;
