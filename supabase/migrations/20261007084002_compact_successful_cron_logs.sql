-- Successful scheduler runs need a shorter diagnostic window than failures.
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' SET statement_timeout = '60s'
AS $$
BEGIN
  DELETE FROM public.vanguard_llm_usage
  WHERE created_at < now() - interval '90 days';
  DELETE FROM public.vanguard_pipeline_runs
  WHERE started_at < now() - interval '90 days';
  DELETE FROM cron.job_run_details
  WHERE end_time < now() - interval '7 days'
     OR (status = 'succeeded' AND end_time < now() - interval '3 days');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_logs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_logs() TO service_role;
