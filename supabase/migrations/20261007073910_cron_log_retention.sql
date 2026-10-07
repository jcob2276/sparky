-- Keep operational history bounded without changing financial data retention.
-- Reuse the existing cleanup job; explicit schemas are required by empty search_path.
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '60s'
AS $function$
BEGIN
  DELETE FROM public.vanguard_llm_usage
  WHERE created_at < now() - interval '90 days';

  DELETE FROM public.vanguard_pipeline_runs
  WHERE started_at < now() - interval '90 days';

  -- Never delete running jobs (end_time is NULL).
  DELETE FROM cron.job_run_details
  WHERE end_time < now() - interval '7 days';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_logs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_logs() TO service_role;

-- Scheduling by the existing name updates the job instead of duplicating it.
SELECT cron.schedule(
  'cleanup-old-logs',
  '0 3 * * *',
  'SELECT public.cleanup_old_logs()'
);
