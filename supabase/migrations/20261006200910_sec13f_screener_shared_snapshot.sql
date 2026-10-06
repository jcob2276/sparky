CREATE OR REPLACE VIEW public.vw_sec13f_screener WITH (security_invoker=true) AS
WITH reports AS MATERIALIZED (SELECT * FROM public.vw_sec13f_verified_reports),
period AS MATERIALIZED (SELECT max(period_of_report) AS period_of_report FROM reports),
scoped AS MATERIALIZED (
  SELECT r.* FROM reports r CROSS JOIN period p
  WHERE r.period_of_report IN (p.period_of_report,(date_trunc('quarter',p.period_of_report)-interval '1 day')::date)
), mapping AS MATERIALIZED (
  SELECT upper(cusip) AS cusip,min(ticker) AS ticker FROM public.vw_consensus
  WHERE cusip IS NOT NULL AND ticker IS NOT NULL
  GROUP BY upper(cusip) HAVING count(DISTINCT ticker)=1
), snapshot AS MATERIALIZED (
  SELECT m.ticker,r.investor_id,r.period_of_report,r.filing_url,
    sum(s.quantity) AS shares,sum(s.value_usd) AS value_usd
  FROM scoped r JOIN public.sec13f_positions s ON s.filing_id=r.id
  JOIN mapping m ON m.cusip=s.cusip
  WHERE s.quantity_type='SH' AND s.put_call IS NULL
  GROUP BY m.ticker,r.investor_id,r.period_of_report,r.filing_url HAVING sum(s.quantity)>0
), pairs AS MATERIALIZED (
  SELECT c.investor_id,c.period_of_report,p.period_of_report AS previous_period,c.filing_url,p.filing_url AS previous_filing_url
  FROM scoped c JOIN scoped p ON p.investor_id=c.investor_id
    AND p.period_of_report=(date_trunc('quarter',c.period_of_report)-interval '1 day')::date
  WHERE c.period_of_report=(SELECT period_of_report FROM period)
    AND c.period_of_report=(date_trunc('quarter',c.period_of_report)+interval '3 months - 1 day')::date
), deltas AS (
  SELECT p.investor_id,h.ticker,p.filing_url,p.previous_filing_url,
    coalesce(sum(h.shares) FILTER(WHERE h.period_of_report=p.period_of_report),0)
      - coalesce(sum(h.shares) FILTER(WHERE h.period_of_report=p.previous_period),0) AS shares_delta
  FROM pairs p JOIN snapshot h ON h.investor_id=p.investor_id
    AND h.period_of_report IN (p.period_of_report,p.previous_period)
  GROUP BY p.investor_id,h.ticker,p.filing_url,p.previous_filing_url
), holdings AS (
  SELECT ticker,count(DISTINCT investor_id)::integer AS holders,sum(value_usd) AS total_value,
    jsonb_agg(DISTINCT filing_url) AS holding_sources FROM snapshot
  WHERE period_of_report=(SELECT period_of_report FROM period) GROUP BY ticker
), changes AS (
  SELECT ticker,count(DISTINCT investor_id)::integer AS compared_funds,
    count(*) FILTER(WHERE shares_delta>0)::integer AS reported_increases,
    count(*) FILTER(WHERE shares_delta<0)::integer AS reported_decreases,
    jsonb_agg(DISTINCT filing_url)||jsonb_agg(DISTINCT previous_filing_url) AS change_sources
  FROM deltas GROUP BY ticker
), names AS (SELECT ticker,min(company_name) AS company_name FROM public.vw_consensus GROUP BY ticker)
SELECT coalesce(h.ticker,c.ticker) AS ticker,n.company_name,p.period_of_report,
  (date_trunc('quarter',p.period_of_report)-interval '1 day')::date AS previous_period,
  coalesce(h.holders,0) AS holders,coalesce(h.total_value,0) AS total_value,
  coalesce(c.compared_funds,0) AS compared_funds,
  CASE WHEN c.compared_funds>0 THEN c.reported_increases END AS reported_increases,
  CASE WHEN c.compared_funds>0 THEN c.reported_decreases END AS reported_decreases,
  CASE WHEN c.compared_funds>0 THEN c.reported_increases-c.reported_decreases END AS net_changes,
  coalesce(h.holding_sources,'[]'::jsonb)||coalesce(c.change_sources,'[]'::jsonb) AS source_urls
FROM holdings h FULL JOIN changes c ON c.ticker=h.ticker
CROSS JOIN period p LEFT JOIN names n ON n.ticker=coalesce(h.ticker,c.ticker);
NOTIFY pgrst,'reload schema';
