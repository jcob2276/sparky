-- Technical delivery recovery only. This sends no user messages.
SELECT cron.schedule('health-coach-job-recovery','*/2 * * * *',
  $$SELECT public.dispatch_health_coach_jobs();$$);
