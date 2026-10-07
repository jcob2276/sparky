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
), positions AS MATERIALIZED (
  SELECT r.id,r.investor_id,r.period_of_report,r.filing_url,r.source_urls,s.cusip,s.quantity,s.value_usd
  FROM scoped r CROSS JOIN LATERAL unnest(r.document_ids) d(document_id)
  JOIN public.sec13f_positions s ON s.filing_id=d.document_id
  WHERE s.quantity_type='SH' AND s.put_call IS NULL AND s.cusip=ANY(ARRAY(SELECT cusip FROM mapping))
), snapshot AS MATERIALIZED (
  SELECT m.ticker,r.investor_id,r.period_of_report,r.filing_url,r.source_urls,
    sum(r.quantity) AS shares,sum(r.value_usd) AS value_usd
  FROM positions r
  JOIN mapping m ON m.cusip=r.cusip
  GROUP BY m.ticker,r.investor_id,r.period_of_report,r.filing_url,r.source_urls HAVING sum(r.quantity)>0
), pairs AS MATERIALIZED (
  SELECT c.investor_id,c.period_of_report,p.period_of_report AS previous_period,c.filing_url,p.filing_url AS previous_filing_url,c.source_urls,p.source_urls AS previous_source_urls
  FROM scoped c JOIN scoped p ON p.investor_id=c.investor_id
    AND p.period_of_report=(date_trunc('quarter',c.period_of_report)-interval '1 day')::date
  WHERE c.period_of_report=(SELECT period_of_report FROM period)
    AND c.period_of_report=(date_trunc('quarter',c.period_of_report)+interval '3 months - 1 day')::date
), deltas AS (
  SELECT p.investor_id,h.ticker,p.filing_url,p.previous_filing_url,p.source_urls,p.previous_source_urls,
    coalesce(sum(h.shares) FILTER(WHERE h.period_of_report=p.period_of_report),0)
      - coalesce(sum(h.shares) FILTER(WHERE h.period_of_report=p.previous_period),0) AS shares_delta
  FROM pairs p JOIN snapshot h ON h.investor_id=p.investor_id
    AND h.period_of_report IN (p.period_of_report,p.previous_period)
  GROUP BY p.investor_id,h.ticker,p.filing_url,p.previous_filing_url,p.source_urls,p.previous_source_urls
), holdings AS (
  SELECT ticker,count(DISTINCT investor_id)::integer AS holders,sum(value_usd) AS total_value,
    jsonb_path_query_array(jsonb_agg(source_urls),'$[*][*]') AS holding_sources FROM snapshot
  WHERE period_of_report=(SELECT period_of_report FROM period) GROUP BY ticker
), changes AS (
  SELECT ticker,count(DISTINCT investor_id)::integer AS compared_funds,
    count(*) FILTER(WHERE shares_delta>0)::integer AS reported_increases,
    count(*) FILTER(WHERE shares_delta<0)::integer AS reported_decreases,
    jsonb_path_query_array(jsonb_agg(source_urls)||jsonb_agg(previous_source_urls),'$[*][*]') AS change_sources
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


CREATE OR REPLACE VIEW public.vw_sec13f_verified_changes WITH (security_invoker=true) AS
WITH reports AS MATERIALIZED (SELECT * FROM public.vw_sec13f_verified_reports),
period AS MATERIALIZED (SELECT max(period_of_report) AS period_of_report FROM reports),
scoped AS MATERIALIZED (
  SELECT r.* FROM reports r CROSS JOIN period p
  WHERE r.period_of_report IN (p.period_of_report,(date_trunc('quarter',p.period_of_report)-interval '1 day')::date)
), mapping AS MATERIALIZED (
  SELECT upper(cusip) AS cusip,min(ticker) AS ticker FROM public.vw_consensus
  WHERE cusip IS NOT NULL AND ticker IS NOT NULL
  GROUP BY upper(cusip) HAVING count(DISTINCT ticker)=1
), positions AS MATERIALIZED (
  SELECT r.id,r.investor_id,r.period_of_report,r.filing_url,r.source_urls,s.cusip,s.quantity,s.value_usd
  FROM scoped r CROSS JOIN LATERAL unnest(r.document_ids) d(document_id)
  JOIN public.sec13f_positions s ON s.filing_id=d.document_id
  WHERE s.quantity_type='SH' AND s.put_call IS NULL AND s.cusip=ANY(ARRAY(SELECT cusip FROM mapping))
), snapshot AS MATERIALIZED (
  SELECT m.ticker,r.investor_id,r.period_of_report,r.filing_url,r.source_urls,
    sum(r.quantity) AS shares,sum(r.value_usd) AS value_usd
  FROM positions r
  JOIN mapping m ON m.cusip=r.cusip
  GROUP BY m.ticker,r.investor_id,r.period_of_report,r.filing_url,r.source_urls HAVING sum(r.quantity)>0
), pairs AS MATERIALIZED (
  SELECT c.investor_id,c.period_of_report,p.period_of_report AS previous_period,
    c.filing_url,c.filing_date,p.filing_url AS previous_filing_url,c.source_urls||p.source_urls AS source_urls
  FROM scoped c JOIN scoped p ON p.investor_id=c.investor_id
    AND p.period_of_report=(date_trunc('quarter',c.period_of_report)-interval '1 day')::date
  WHERE c.period_of_report=(SELECT period_of_report FROM period)
    AND c.period_of_report=(date_trunc('quarter',c.period_of_report)+interval '3 months - 1 day')::date
), holdings AS (
  SELECT p.investor_id,p.period_of_report,p.previous_period,p.filing_url,p.filing_date,p.previous_filing_url,h.ticker,
    coalesce(sum(h.shares) FILTER(WHERE h.period_of_report=p.period_of_report),0) AS shares_now,
    coalesce(sum(h.shares) FILTER(WHERE h.period_of_report=p.previous_period),0) AS shares_previous,
    coalesce(sum(h.value_usd) FILTER(WHERE h.period_of_report=p.period_of_report),0) AS value_now,p.source_urls
  FROM pairs p JOIN snapshot h ON h.investor_id=p.investor_id
    AND h.period_of_report IN(p.period_of_report,p.previous_period)
  GROUP BY p.investor_id,p.period_of_report,p.previous_period,p.filing_url,p.filing_date,p.previous_filing_url,h.ticker,p.source_urls
)
SELECT investor_id,period_of_report,previous_period,filing_url,filing_date,previous_filing_url,ticker,
  shares_now,shares_previous,value_now,shares_now-shares_previous AS shares_delta,
  CASE WHEN shares_previous=0 THEN 'reported_new' WHEN shares_now=0 THEN 'reported_absent'
    WHEN shares_now>shares_previous THEN 'reported_increase' WHEN shares_now<shares_previous THEN 'reported_decrease'
    ELSE 'reported_unchanged' END AS change_type,source_urls
FROM holdings;


NOTIFY pgrst,'reload schema';
