-- Resolve the report before aggregating its rows. An excluded amendment chain
-- must return empty without scanning the full positions archive.
CREATE OR REPLACE VIEW public.vw_sec13f_fund_positions WITH (security_invoker=true) AS
WITH mapping AS MATERIALIZED (
  SELECT upper(cusip) AS cusip,min(ticker) AS ticker FROM public.vw_consensus
  WHERE cusip IS NOT NULL AND ticker IS NOT NULL GROUP BY upper(cusip) HAVING count(DISTINCT ticker)=1
)
SELECT r.investor_id,r.period_of_report,r.filing_url,r.filing_date,h.cusip,m.ticker,h.company_name,h.shares,h.value_usd
FROM public.vw_sec13f_verified_reports r
CROSS JOIN LATERAL (
  SELECT p.cusip,min(p.issuer_name) AS company_name,sum(p.quantity) AS shares,sum(p.value_usd) AS value_usd
  FROM public.sec13f_positions p WHERE p.filing_id=ANY(r.document_ids)
    AND p.quantity_type='SH' AND p.put_call IS NULL
  GROUP BY p.cusip HAVING sum(p.quantity)>0
) h LEFT JOIN mapping m ON m.cusip=h.cusip;
NOTIFY pgrst,'reload schema';
