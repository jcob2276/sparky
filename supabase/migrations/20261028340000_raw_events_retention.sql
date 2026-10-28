-- vanguard_raw_events to dziennik surowego wejscia z vaultIngest (tylko zapis, bez czytelnika): retencja 180 dni w cleanup_old_logs.
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '60s'
AS $function$
BEGIN
  DELETE FROM public.vanguard_llm_usage
  WHERE created_at < now() - interval '90 days';
  DELETE FROM public.vanguard_pipeline_runs
  WHERE started_at < now() - interval '90 days';
  DELETE FROM public.vanguard_oracle_runs
  WHERE created_at < now() - interval '90 days';
  DELETE FROM public.view_events
  WHERE created_at < now() - interval '90 days';
  DELETE FROM public.vanguard_raw_events
  WHERE ingested_at < now() - interval '180 days';
  DELETE FROM cron.job_run_details
  WHERE end_time < now() - interval '7 days'
     OR (status = 'succeeded' AND end_time < now() - interval '3 days');
END;
$function$;
