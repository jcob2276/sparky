-- ============================================================
-- CALENDAR WATCH: dwukierunkowa synchronizacja Google <-> Vanguard.
-- Google Calendar push notifications (webhook) pingają edge function
-- calendar-watch przy KAŻDEJ zmianie w kalendarzu (sekundy zamiast 30 min).
-- Kanał watch wygasa po ~7 dniach — cron odnawia go co tydzień.
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."vanguard_calendar_watch" (
    "user_id" "uuid" PRIMARY KEY,
    "channel_id" "text" NOT NULL,
    "token" "text" NOT NULL,
    "resource_id" "text",
    "expiration" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."vanguard_calendar_watch" OWNER TO "postgres";

-- RLS: dostęp tylko przez service_role (edge functions); użytkownik nie czyta.
ALTER TABLE "public"."vanguard_calendar_watch" ENABLE ROW LEVEL SECURITY;

-- Tygodniowe odnawianie kanałów watch (niedziela 03:30 UTC).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'renew-calendar-watch') THEN
    PERFORM cron.schedule(
      'renew-calendar-watch',
      '30 3 * * 0',
      $cmd$
        SELECT net.http_post(
          url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/calendar-watch',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vanguard_cron_service_role_key')
          ),
          body := jsonb_build_object('action', 'renew-all')
        );
      $cmd$
    );
  END IF;
END;
$$;
