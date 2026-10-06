-- Parsed original reports only; unreconciled amendments stay excluded by the shared gate.
CREATE VIEW public.vw_sec13f_fund_reports WITH (security_invoker=true) AS
SELECT r.*, f.verified_entry_count, f.value_reconciliation
FROM public.vw_sec13f_verified_reports r JOIN public.filings f ON f.id=r.id;

-- Preserve every disclosed long SH position, including unmapped CUSIPs.
-- Share count changes are report-to-report observations, not execution records.
CREATE VIEW public.vw_sec13f_fund_positions WITH (security_invoker=true) AS
WITH mapping AS MATERIALIZED (
  SELECT upper(cusip) AS cusip, min(ticker) AS ticker
  FROM public.vw_consensus WHERE cusip IS NOT NULL AND ticker IS NOT NULL
  GROUP BY upper(cusip) HAVING count(DISTINCT ticker)=1
), positions AS NOT MATERIALIZED (
  SELECT r.investor_id,r.period_of_report,r.filing_url,r.filing_date,p.cusip,
         p.issuer_name,p.quantity,p.value_usd
  FROM public.vw_sec13f_verified_reports r
  JOIN public.sec13f_positions p ON p.filing_id=r.id
  WHERE p.quantity_type='SH' AND p.put_call IS NULL
)
SELECT p.investor_id,p.period_of_report,p.filing_url,p.filing_date,p.cusip,
       m.ticker,min(p.issuer_name) AS company_name,
       sum(p.quantity) AS shares,sum(p.value_usd) AS value_usd
FROM positions p LEFT JOIN mapping m ON m.cusip=p.cusip
GROUP BY p.investor_id,p.period_of_report,p.filing_url,p.filing_date,p.cusip,m.ticker
HAVING sum(p.quantity)>0;

GRANT SELECT ON public.vw_sec13f_fund_reports, public.vw_sec13f_fund_positions TO anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
