CREATE OR REPLACE VIEW public.vw_sec13f_screener WITH (security_invoker=true) AS
WITH holdings AS (
  SELECT ticker,count(DISTINCT investor_id)::integer AS holders,
    sum(value_usd) AS total_value,jsonb_agg(DISTINCT filing_url) AS holding_sources
  FROM public.vw_sec13f_current_holdings GROUP BY ticker
), changes AS (
  SELECT ticker,count(DISTINCT investor_id)::integer AS compared_funds,
    count(*) FILTER (WHERE shares_delta>0)::integer AS reported_increases,
    count(*) FILTER (WHERE shares_delta<0)::integer AS reported_decreases,
    jsonb_agg(DISTINCT filing_url) AS change_sources
  FROM public.vw_sec13f_verified_changes GROUP BY ticker
), names AS (
  SELECT ticker,min(company_name) AS company_name FROM public.vw_consensus GROUP BY ticker
), period AS MATERIALIZED (
  SELECT max(period_of_report) AS period_of_report FROM public.vw_sec13f_verified_reports
)
SELECT coalesce(h.ticker,c.ticker) AS ticker,n.company_name,p.period_of_report,
  (date_trunc('quarter',p.period_of_report)-interval '1 day')::date AS previous_period,
  coalesce(h.holders,0) AS holders,coalesce(h.total_value,0) AS total_value,
  coalesce(c.compared_funds,0) AS compared_funds,
  CASE WHEN c.compared_funds>0 THEN c.reported_increases END AS reported_increases,
  CASE WHEN c.compared_funds>0 THEN c.reported_decreases END AS reported_decreases,
  CASE WHEN c.compared_funds>0 THEN c.reported_increases-c.reported_decreases END AS net_changes,
  coalesce(h.holding_sources,'[]'::jsonb) || coalesce(c.change_sources,'[]'::jsonb) AS source_urls
FROM holdings h FULL JOIN changes c ON c.ticker=h.ticker
CROSS JOIN period p LEFT JOIN names n ON n.ticker=coalesce(h.ticker,c.ticker);

GRANT SELECT ON public.vw_sec13f_screener TO anon,authenticated;
