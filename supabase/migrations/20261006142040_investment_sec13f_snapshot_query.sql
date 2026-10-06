CREATE OR REPLACE VIEW public.vw_sec13f_verified_holdings WITH (security_invoker=true) AS
WITH mapping AS MATERIALIZED (
  SELECT upper(cusip) AS cusip,min(ticker) AS ticker
  FROM public.vw_consensus WHERE cusip IS NOT NULL AND ticker IS NOT NULL
  GROUP BY upper(cusip) HAVING count(DISTINCT ticker)=1
), reports AS MATERIALIZED (
  SELECT * FROM public.vw_sec13f_verified_reports
), positions AS MATERIALIZED (
  SELECT p.cusip,p.quantity,p.value_usd,f.investor_id,f.period_of_report,f.filing_date,f.filing_url
  FROM public.sec13f_positions p JOIN reports f ON f.id=p.filing_id
  WHERE p.quantity_type='SH' AND p.put_call IS NULL
)
SELECT m.ticker,p.investor_id,p.period_of_report,p.filing_date,p.filing_url,
  sum(p.quantity) AS shares,sum(p.value_usd) AS value_usd
FROM positions p JOIN mapping m ON m.cusip=p.cusip
GROUP BY m.ticker,p.investor_id,p.period_of_report,p.filing_date,p.filing_url
HAVING sum(p.quantity)>0;
