-- Migration: context_cache_cron
-- Purpose: Daily execution of 90-day context snapshot compilation at 03:00 UTC (04:00 CET)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'build-context-cache-daily') THEN
    PERFORM cron.unschedule('build-context-cache-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'build-context-cache-daily',
  '0 3 * * *',
  $$SELECT pgmq.send('sparky_jobs', '{"type":"build_context_cache"}'::jsonb);$$
);
