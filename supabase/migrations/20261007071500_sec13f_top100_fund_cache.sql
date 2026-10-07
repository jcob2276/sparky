-- User-requested top100 per document cache. Full-document comparisons remain gated separately.
-- A reconciled source summary alone does not prove that the database retained all rows.
-- Partial cached tables must never be published as complete portfolios or exits.
CREATE OR REPLACE VIEW public.vw_sec13f_cached_report_documents WITH (security_invoker=true) AS
WITH stored AS MATERIALIZED (
  SELECT filing_id,count(*) AS entries FROM public.sec13f_positions GROUP BY filing_id
), originals AS MATERIALIZED (
  SELECT DISTINCT ON (investor_id,period_of_report) f.* FROM public.filings f
  WHERE is_amendment IS FALSE
  ORDER BY investor_id,period_of_report,filing_date DESC,accession_no DESC,id
), chains AS MATERIALIZED (
  SELECT investor_id,period_of_report,
    count(*) FILTER(WHERE is_amendment IS FALSE) AS originals,
    count(*) FILTER(WHERE is_amendment IS TRUE)::integer AS amendments,
    array_agg(amendment_number ORDER BY filing_date,accession_no,id) FILTER(WHERE is_amendment IS TRUE) AS numbers,
    coalesce(max(amendment_number) FILTER(WHERE amendment_type='RESTATEMENT'),0) AS last_restatement,
    bool_and(positions_status='parsed' AND is_amendment IS NOT NULL
      AND filing_date IS NOT NULL AND filing_url IS NOT NULL
      AND verified_entry_count IS NOT NULL AND verified_value_usd IS NOT NULL
      AND coalesce(s.entries,0)=least(verified_entry_count,100)
      AND (is_amendment IS FALSE OR
        (amendment_type IS NOT NULL AND amendment_type IN ('RESTATEMENT','NEW HOLDINGS') AND amendment_number>0))) AS complete,
    min(filing_date) FILTER(WHERE is_amendment IS TRUE) AS first_amendment_date
  FROM public.filings f LEFT JOIN stored s ON s.filing_id=f.id GROUP BY investor_id,period_of_report
), amended AS MATERIALIZED (
  SELECT o.id AS report_id,c.* FROM chains c JOIN originals o USING(investor_id,period_of_report)
  WHERE c.amendments>0 AND c.originals=1 AND c.complete IS TRUE
    AND c.numbers=ARRAY(SELECT generate_series(1,c.amendments))
    AND c.first_amendment_date>=o.filing_date
)
SELECT o.id AS report_id,o.id AS document_id,o.investor_id,o.period_of_report
FROM originals o JOIN public.investors i ON i.id=o.investor_id AND i.is_active IS TRUE
LEFT JOIN stored s ON s.filing_id=o.id
WHERE o.positions_status='parsed' AND coalesce(s.entries,0)=least(o.verified_entry_count,100)
  AND NOT EXISTS(SELECT 1 FROM public.filings a
    WHERE a.investor_id=o.investor_id AND a.period_of_report=o.period_of_report AND a.is_amendment IS TRUE)
UNION ALL
SELECT a.report_id,f.id,a.investor_id,a.period_of_report
FROM amended a JOIN public.investors i ON i.id=a.investor_id AND i.is_active IS TRUE
JOIN public.filings f ON f.investor_id=a.investor_id AND f.period_of_report=a.period_of_report
WHERE (a.last_restatement=0 AND f.is_amendment IS FALSE)
  OR (f.is_amendment IS TRUE AND f.amendment_number>=greatest(a.last_restatement,1));
NOTIFY pgrst,'reload schema';
CREATE OR REPLACE VIEW public.vw_sec13f_cached_reports WITH (security_invoker=true) AS
SELECT d.report_id AS id,d.investor_id,d.period_of_report,max(f.filing_date) AS filing_date,
  (array_agg(f.filing_url ORDER BY f.filing_date DESC,f.amendment_number DESC NULLS LAST,f.id))[1] AS filing_url,
  sum(f.verified_value_usd) AS verified_value_usd,
  sum(f.verified_entry_count)::integer AS verified_entry_count,
  CASE WHEN bool_or(f.value_reconciliation='rounding_difference') THEN 'rounding_difference' ELSE 'exact' END AS value_reconciliation,
  sum(f.reported_cover_value_usd) AS reported_cover_value_usd,
  sum(f.value_difference_usd) AS value_difference_usd,
  jsonb_agg(DISTINCT f.filing_url) AS source_urls,
  coalesce(jsonb_agg(jsonb_build_object('source_url',f.filing_url,'reported_total_usd',f.reported_cover_value_usd,
    'computed_total_usd',f.verified_value_usd,'difference_usd',f.value_difference_usd))
    FILTER(WHERE f.value_reconciliation='rounding_difference'),'[]'::jsonb) AS summary_warnings,array_agg(f.id) AS document_ids,
  bool_and(coalesce(s.entries,0)=f.verified_entry_count) AS has_complete_positions,
  sum(coalesce(s.entries,0))::integer AS stored_entry_count
FROM public.vw_sec13f_cached_report_documents d JOIN public.filings f ON f.id=d.document_id
LEFT JOIN (SELECT filing_id,count(*) AS entries FROM public.sec13f_positions GROUP BY filing_id) s ON s.filing_id=f.id
GROUP BY d.report_id,d.investor_id,d.period_of_report;

CREATE OR REPLACE VIEW public.vw_sec13f_fund_reports WITH (security_invoker=true) AS
SELECT r.id,r.investor_id,r.period_of_report,r.filing_date,r.filing_url,r.verified_value_usd,
  r.verified_entry_count,r.value_reconciliation,r.source_urls,r.summary_warnings,
  r.has_complete_positions,r.stored_entry_count
FROM public.vw_sec13f_cached_reports r;
-- Resolve the report before aggregating its rows. An excluded amendment chain
-- must return empty without scanning the full positions archive.
CREATE OR REPLACE VIEW public.vw_sec13f_fund_positions WITH (security_invoker=true) AS
WITH mapping AS MATERIALIZED (
  SELECT upper(cusip) AS cusip,min(ticker) AS ticker FROM public.vw_consensus
  WHERE cusip IS NOT NULL AND ticker IS NOT NULL GROUP BY upper(cusip) HAVING count(DISTINCT ticker)=1
)
SELECT r.investor_id,r.period_of_report,r.filing_url,r.filing_date,h.cusip,m.ticker,h.company_name,h.shares,h.value_usd
FROM public.vw_sec13f_cached_reports r
CROSS JOIN LATERAL (
  SELECT p.cusip,min(p.issuer_name) AS company_name,sum(p.quantity) AS shares,sum(p.value_usd) AS value_usd
  FROM public.sec13f_positions p WHERE p.filing_id=ANY(r.document_ids)
    AND p.quantity_type='SH' AND p.put_call IS NULL
  GROUP BY p.cusip HAVING sum(p.quantity)>0
) h LEFT JOIN mapping m ON m.cusip=h.cusip;
NOTIFY pgrst,'reload schema';

GRANT SELECT ON public.vw_sec13f_cached_report_documents,public.vw_sec13f_cached_reports TO anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
