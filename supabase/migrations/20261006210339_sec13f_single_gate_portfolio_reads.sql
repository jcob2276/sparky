CREATE OR REPLACE VIEW public.vw_sec13f_fund_positions WITH (security_invoker=true) AS
WITH mapping AS MATERIALIZED (
  SELECT upper(cusip) AS cusip, min(ticker) AS ticker
  FROM public.vw_consensus WHERE cusip IS NOT NULL AND ticker IS NOT NULL
  GROUP BY upper(cusip) HAVING count(DISTINCT ticker)=1
), positions AS NOT MATERIALIZED (
  SELECT r.investor_id,r.period_of_report,r.filing_url,r.filing_date,p.cusip,
         p.issuer_name,p.quantity,p.value_usd
  FROM public.vw_sec13f_verified_reports r
  CROSS JOIN LATERAL unnest(r.document_ids) d(document_id) JOIN public.sec13f_positions p ON p.filing_id=d.document_id
  WHERE p.quantity_type='SH' AND p.put_call IS NULL
)
SELECT p.investor_id,p.period_of_report,p.filing_url,p.filing_date,p.cusip,
       m.ticker,min(p.issuer_name) AS company_name,
       sum(p.quantity) AS shares,sum(p.value_usd) AS value_usd
FROM positions p LEFT JOIN mapping m ON m.cusip=p.cusip
GROUP BY p.investor_id,p.period_of_report,p.filing_url,p.filing_date,p.cusip,m.ticker
HAVING sum(p.quantity)>0;


CREATE OR REPLACE VIEW public.vw_sec13f_verified_holdings WITH (security_invoker=true) AS
WITH mapping AS (
  SELECT upper(cusip) AS cusip,min(ticker) AS ticker FROM public.vw_consensus
  WHERE cusip IS NOT NULL AND ticker IS NOT NULL GROUP BY upper(cusip) HAVING count(DISTINCT ticker)=1
)
SELECT m.ticker,f.investor_id,f.period_of_report,f.filing_date,f.filing_url,
  sum(p.quantity) AS shares,sum(p.value_usd) AS value_usd,f.source_urls
FROM public.vw_sec13f_verified_reports f CROSS JOIN LATERAL unnest(f.document_ids) d(document_id) JOIN public.sec13f_positions p ON p.filing_id=d.document_id
JOIN mapping m ON m.cusip=p.cusip WHERE p.quantity_type='SH' AND p.put_call IS NULL
GROUP BY m.ticker,f.investor_id,f.period_of_report,f.filing_date,f.filing_url,f.source_urls HAVING sum(p.quantity)>0;

CREATE OR REPLACE VIEW public.vw_sec13f_company_history WITH (security_invoker=true) AS
WITH mapping AS NOT MATERIALIZED (
  SELECT upper(cusip) AS cusip,min(ticker) AS ticker
  FROM public.vw_consensus WHERE cusip IS NOT NULL AND ticker IS NOT NULL
  GROUP BY upper(cusip) HAVING count(DISTINCT ticker)=1
), reports AS MATERIALIZED (
  SELECT r.*
  FROM public.vw_sec13f_verified_reports r
), holdings AS NOT MATERIALIZED (
  SELECT m.ticker,r.investor_id,r.period_of_report,r.filing_url,r.filing_date,
    r.reported_cover_value_usd,r.verified_value_usd,r.value_difference_usd,r.value_reconciliation,r.source_urls,r.summary_warnings,
    sum(p.quantity) AS shares,sum(p.value_usd) AS value_usd
  FROM reports r CROSS JOIN LATERAL unnest(r.document_ids) d(document_id)
  JOIN public.sec13f_positions p ON p.filing_id=d.document_id JOIN mapping m ON m.cusip=p.cusip
  WHERE p.quantity_type='SH' AND p.put_call IS NULL
  GROUP BY m.ticker,r.investor_id,r.period_of_report,r.filing_url,r.filing_date,
    r.reported_cover_value_usd,r.verified_value_usd,r.value_difference_usd,r.value_reconciliation,r.source_urls,r.summary_warnings
  HAVING sum(p.quantity)>0
)
SELECT h.ticker,h.period_of_report,count(DISTINCT h.investor_id)::integer AS reported_holders,
  sum(h.shares) AS reported_shares,sum(h.value_usd) AS reported_value_usd,
  max(h.filing_date) AS latest_filing_date,jsonb_path_query_array(jsonb_agg(h.source_urls),'$[*][*]') AS source_urls,
  jsonb_path_query_array(jsonb_agg(h.summary_warnings),'$[*][*]') AS summary_warnings
FROM holdings h GROUP BY h.ticker,h.period_of_report;
NOTIFY pgrst,'reload schema';


NOTIFY pgrst,'reload schema';
