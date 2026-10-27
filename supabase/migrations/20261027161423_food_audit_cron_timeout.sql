-- Full paginated audit can exceed pg_net's default timeout. Keep the existing job and credentials.
DO $migration$
DECLARE v_job record;
BEGIN
  SELECT jobid, command INTO v_job FROM cron.job WHERE jobname = 'food-integrity-audit';
  IF NOT FOUND THEN RAISE EXCEPTION 'food-integrity-audit cron is missing'; END IF;
  IF v_job.command NOT LIKE '%timeout_milliseconds%' THEN
    IF strpos(v_job.command, $body$body := '{}'::jsonb$body$) = 0 THEN
      RAISE EXCEPTION 'Unexpected food-integrity-audit cron command';
    END IF;
    PERFORM cron.alter_job(job_id := v_job.jobid, command := replace(
      v_job.command,
      $body$body := '{}'::jsonb$body$,
      $body$body := '{}'::jsonb, timeout_milliseconds := 120000$body$
    ));
  END IF;
END;
$migration$;
