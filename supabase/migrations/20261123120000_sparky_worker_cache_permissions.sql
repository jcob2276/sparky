-- Migration: sparky_worker_cache_permissions
-- Purpose: Grant SELECT on tables required for 90-day context cache compilation to sparky_worker

GRANT SELECT ON TABLE public.user_settings TO sparky_worker;
GRANT SELECT ON TABLE public.vanguard_stream TO sparky_worker;
GRANT SELECT ON TABLE public.oura_daily_summary TO sparky_worker;
GRANT SELECT ON TABLE public.strava_activities TO sparky_worker;
GRANT SELECT ON public.strava_activities_clean TO sparky_worker;
GRANT SELECT ON TABLE public.daily_reconciliations TO sparky_worker;

-- Ensure RLS policies allow sparky_worker to read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Allow sparky_worker select'
  ) THEN
    CREATE POLICY "Allow sparky_worker select" ON public.user_settings FOR SELECT TO sparky_worker USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vanguard_stream' AND policyname = 'Allow sparky_worker select'
  ) THEN
    CREATE POLICY "Allow sparky_worker select" ON public.vanguard_stream FOR SELECT TO sparky_worker USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'oura_daily_summary' AND policyname = 'Allow sparky_worker select'
  ) THEN
    CREATE POLICY "Allow sparky_worker select" ON public.oura_daily_summary FOR SELECT TO sparky_worker USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'strava_activities' AND policyname = 'Allow sparky_worker select'
  ) THEN
    CREATE POLICY "Allow sparky_worker select" ON public.strava_activities FOR SELECT TO sparky_worker USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'daily_reconciliations' AND policyname = 'Allow sparky_worker select'
  ) THEN
    CREATE POLICY "Allow sparky_worker select" ON public.daily_reconciliations FOR SELECT TO sparky_worker USING (true);
  END IF;
END $$;
