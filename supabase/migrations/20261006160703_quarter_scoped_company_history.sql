-- Avoid expanding the same verified-report gate twice for company history.
-- The outer ticker filter reaches the CUSIP index before per-report aggregation.
CREATE OR REPLACE VIEW public.vw_sec13f_company_history WITH (security_invoker=true) AS
WITH mapping AS NOT MATERIALIZED (
  SELECT upper(cusip) AS cusip,min(ticker) AS ticker
  FROM public.vw_consensus WHERE cusip IS NOT NULL AND ticker IS NOT NULL
  GROUP BY upper(cusip) HAVING count(DISTINCT ticker)=1
), reports AS MATERIALIZED (
  SELECT r.*,f.reported_cover_value_usd,f.value_difference_usd,f.value_reconciliation
  FROM public.vw_sec13f_verified_reports r JOIN public.filings f ON f.id=r.id
), holdings AS NOT MATERIALIZED (
  SELECT m.ticker,r.investor_id,r.period_of_report,r.filing_url,r.filing_date,
    r.reported_cover_value_usd,r.verified_value_usd,r.value_difference_usd,r.value_reconciliation,
    sum(p.quantity) AS shares,sum(p.value_usd) AS value_usd
  FROM mapping m JOIN public.sec13f_positions p ON p.cusip=m.cusip
  JOIN reports r ON r.id=p.filing_id
  WHERE p.quantity_type='SH' AND p.put_call IS NULL
  GROUP BY m.ticker,r.investor_id,r.period_of_report,r.filing_url,r.filing_date,
    r.reported_cover_value_usd,r.verified_value_usd,r.value_difference_usd,r.value_reconciliation
  HAVING sum(p.quantity)>0
)
SELECT h.ticker,h.period_of_report,count(DISTINCT h.investor_id)::integer AS reported_holders,
  sum(h.shares) AS reported_shares,sum(h.value_usd) AS reported_value_usd,
  max(h.filing_date) AS latest_filing_date,jsonb_agg(DISTINCT h.filing_url) AS source_urls,
  coalesce(jsonb_agg(DISTINCT jsonb_build_object('source_url',h.filing_url,
    'reported_total_usd',h.reported_cover_value_usd,'computed_total_usd',h.verified_value_usd,
    'difference_usd',h.value_difference_usd)) FILTER(WHERE h.value_reconciliation='rounding_difference'),'[]'::jsonb) AS summary_warnings
FROM holdings h GROUP BY h.ticker,h.period_of_report;
NOTIFY pgrst,'reload schema';
