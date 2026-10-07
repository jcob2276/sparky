-- A reconciled TOP100 chain is available in the UI, while full comparisons stay gated.
CREATE OR REPLACE FUNCTION public.sec13f_amendment_counts() RETURNS jsonb
LANGUAGE sql STABLE SET search_path=public SET statement_timeout='8s' AS $fn$
  WITH cached AS MATERIALIZED (
    SELECT investor_id,period_of_report,has_complete_positions FROM public.vw_sec13f_cached_reports
  )
  SELECT jsonb_build_object(
    'unreconciled',count(*) FILTER(WHERE cached.investor_id IS NULL),
    'truncated',count(*) FILTER(WHERE cached.investor_id IS NOT NULL AND cached.has_complete_positions IS FALSE),
    'total',count(*))
  FROM public.filings f LEFT JOIN cached USING(investor_id,period_of_report)
  WHERE f.is_amendment IS TRUE;
$fn$;
REVOKE ALL ON FUNCTION public.sec13f_amendment_counts() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sec13f_amendment_counts() TO service_role;
