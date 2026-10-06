CREATE VIEW public.vw_sec13f_verified_reports WITH (security_invoker=true) AS
WITH latest AS (
  SELECT DISTINCT ON (investor_id,period_of_report) f.*
  FROM public.filings f
  WHERE is_amendment=false
  ORDER BY investor_id,period_of_report,filing_date DESC,accession_no DESC,id
)
SELECT f.id,f.investor_id,f.period_of_report,f.filing_date,f.filing_url,f.verified_value_usd
FROM latest f JOIN public.investors i ON i.id=f.investor_id AND i.is_active=true
WHERE f.positions_status='parsed'
AND NOT EXISTS (SELECT 1 FROM public.filings a WHERE a.investor_id=f.investor_id
  AND a.period_of_report=f.period_of_report AND a.is_amendment=true);

CREATE VIEW public.vw_sec13f_verified_holdings WITH (security_invoker=true) AS
WITH mapping AS (
  SELECT upper(cusip) AS cusip,min(ticker) AS ticker
  FROM public.vw_consensus WHERE cusip IS NOT NULL AND ticker IS NOT NULL
  GROUP BY upper(cusip) HAVING count(DISTINCT ticker)=1
)
SELECT m.ticker,f.investor_id,f.period_of_report,f.filing_date,f.filing_url,
  sum(p.quantity) AS shares,sum(p.value_usd) AS value_usd
FROM public.sec13f_positions p
JOIN public.vw_sec13f_verified_reports f ON f.id=p.filing_id
JOIN mapping m ON m.cusip=p.cusip
WHERE p.quantity_type='SH' AND p.put_call IS NULL
GROUP BY m.ticker,f.investor_id,f.period_of_report,f.filing_date,f.filing_url
HAVING sum(p.quantity)>0;

CREATE VIEW public.vw_sec13f_current_holdings WITH (security_invoker=true) AS
SELECT * FROM public.vw_sec13f_verified_holdings
WHERE period_of_report=(SELECT max(period_of_report) FROM public.vw_sec13f_verified_reports);

CREATE VIEW public.vw_sec13f_verified_changes WITH (security_invoker=true) AS
WITH pairs AS (
  SELECT c.investor_id,c.period_of_report,p.period_of_report AS previous_period,
    c.filing_url,c.filing_date,p.filing_url AS previous_filing_url
  FROM public.vw_sec13f_verified_reports c JOIN public.vw_sec13f_verified_reports p
    ON p.investor_id=c.investor_id
    AND p.period_of_report=(date_trunc('quarter',c.period_of_report)-interval '1 day')::date
  WHERE c.period_of_report=(SELECT max(period_of_report) FROM public.vw_sec13f_verified_reports)
    AND c.period_of_report=(date_trunc('quarter',c.period_of_report)+interval '3 months - 1 day')::date
), holdings AS (
  SELECT pairs.*,symbols.ticker,
    coalesce(c.shares,0) AS shares_now,coalesce(p.shares,0) AS shares_previous,
    coalesce(c.value_usd,0) AS value_now
  FROM pairs
  CROSS JOIN LATERAL (
    SELECT ticker FROM public.vw_sec13f_verified_holdings h
    WHERE h.investor_id=pairs.investor_id AND h.period_of_report IN (pairs.period_of_report,pairs.previous_period)
    GROUP BY ticker
  ) symbols
  LEFT JOIN public.vw_sec13f_verified_holdings c ON c.investor_id=pairs.investor_id
    AND c.period_of_report=pairs.period_of_report AND c.ticker=symbols.ticker
  LEFT JOIN public.vw_sec13f_verified_holdings p ON p.investor_id=pairs.investor_id
    AND p.period_of_report=pairs.previous_period AND p.ticker=symbols.ticker
)
SELECT *,shares_now-shares_previous AS shares_delta,
  CASE WHEN shares_previous=0 THEN 'reported_new'
    WHEN shares_now=0 THEN 'reported_absent'
    WHEN shares_now>shares_previous THEN 'reported_increase'
    WHEN shares_now<shares_previous THEN 'reported_decrease'
    ELSE 'reported_unchanged' END AS change_type
FROM holdings;

CREATE OR REPLACE VIEW public.vw_sec13f_company_history WITH (security_invoker=true) AS
SELECT ticker,period_of_report,count(DISTINCT investor_id)::integer AS reported_holders,
  sum(shares) AS reported_shares,sum(value_usd) AS reported_value_usd,
  max(filing_date) AS latest_filing_date,jsonb_agg(DISTINCT filing_url) AS source_urls
FROM public.vw_sec13f_verified_holdings GROUP BY ticker,period_of_report;

GRANT SELECT ON public.vw_sec13f_verified_reports,public.vw_sec13f_verified_holdings,
  public.vw_sec13f_current_holdings,public.vw_sec13f_verified_changes TO anon,authenticated;
