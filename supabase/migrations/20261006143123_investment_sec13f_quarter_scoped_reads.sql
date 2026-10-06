CREATE OR REPLACE VIEW public.vw_sec13f_verified_holdings WITH (security_invoker=true) AS
WITH mapping AS MATERIALIZED (
  SELECT upper(cusip) AS cusip,min(ticker) AS ticker
  FROM public.vw_consensus WHERE cusip IS NOT NULL AND ticker IS NOT NULL
  GROUP BY upper(cusip) HAVING count(DISTINCT ticker)=1
), reports AS MATERIALIZED (
  SELECT * FROM public.vw_sec13f_verified_reports
), positions AS NOT MATERIALIZED (
  SELECT p.cusip,p.quantity,p.value_usd,f.investor_id,f.period_of_report,f.filing_date,f.filing_url
  FROM public.sec13f_positions p JOIN reports f ON f.id=p.filing_id
  WHERE p.quantity_type='SH' AND p.put_call IS NULL
)
SELECT m.ticker,p.investor_id,p.period_of_report,p.filing_date,p.filing_url,
  sum(p.quantity) AS shares,sum(p.value_usd) AS value_usd
FROM positions p JOIN mapping m ON m.cusip=p.cusip
GROUP BY m.ticker,p.investor_id,p.period_of_report,p.filing_date,p.filing_url
HAVING sum(p.quantity)>0;


CREATE OR REPLACE VIEW public.vw_sec13f_current_holdings WITH (security_invoker=true) AS
WITH period AS MATERIALIZED (SELECT max(period_of_report) AS latest FROM public.vw_sec13f_verified_reports)
SELECT * FROM public.vw_sec13f_verified_holdings WHERE period_of_report=(SELECT latest FROM period);
CREATE OR REPLACE VIEW public.vw_sec13f_verified_changes WITH (security_invoker=true) AS
WITH reports AS MATERIALIZED (
  SELECT * FROM public.vw_sec13f_verified_reports
), snapshot AS MATERIALIZED (
  SELECT * FROM public.vw_sec13f_verified_holdings
  WHERE period_of_report IN (
    (SELECT max(period_of_report) FROM reports),
    (SELECT (date_trunc('quarter',max(period_of_report))-interval '1 day')::date FROM reports)
  )
), pairs AS MATERIALIZED (
  SELECT c.investor_id,c.period_of_report,p.period_of_report AS previous_period,
    c.filing_url,c.filing_date,p.filing_url AS previous_filing_url
  FROM reports c JOIN reports p ON p.investor_id=c.investor_id
    AND p.period_of_report=(date_trunc('quarter',c.period_of_report)-interval '1 day')::date
  WHERE c.period_of_report=(SELECT max(period_of_report) FROM reports)
    AND c.period_of_report=(date_trunc('quarter',c.period_of_report)+interval '3 months - 1 day')::date
), holdings AS (
  SELECT pairs.investor_id,pairs.period_of_report,pairs.previous_period,
    pairs.filing_url,pairs.filing_date,pairs.previous_filing_url,h.ticker,
    coalesce(sum(h.shares) FILTER (WHERE h.period_of_report=pairs.period_of_report),0) AS shares_now,
    coalesce(sum(h.shares) FILTER (WHERE h.period_of_report=pairs.previous_period),0) AS shares_previous,
    coalesce(sum(h.value_usd) FILTER (WHERE h.period_of_report=pairs.period_of_report),0) AS value_now
  FROM pairs JOIN snapshot h ON h.investor_id=pairs.investor_id
    AND h.period_of_report IN (pairs.period_of_report,pairs.previous_period)
  GROUP BY pairs.investor_id,pairs.period_of_report,pairs.previous_period,
    pairs.filing_url,pairs.filing_date,pairs.previous_filing_url,h.ticker
)
SELECT *,shares_now-shares_previous AS shares_delta,
  CASE WHEN shares_previous=0 THEN 'reported_new' WHEN shares_now=0 THEN 'reported_absent'
    WHEN shares_now>shares_previous THEN 'reported_increase'
    WHEN shares_now<shares_previous THEN 'reported_decrease'
    ELSE 'reported_unchanged' END AS change_type
FROM holdings;
