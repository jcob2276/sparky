-- A reconciled source summary alone does not prove that the database retained all rows.
-- Partial cached tables must never be published as complete portfolios or exits.
CREATE OR REPLACE VIEW public.vw_sec13f_report_documents WITH (security_invoker=true) AS
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
      AND coalesce(s.entries,0)=verified_entry_count
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
WHERE o.positions_status='parsed' AND coalesce(s.entries,0)=o.verified_entry_count
  AND NOT EXISTS(SELECT 1 FROM public.filings a
    WHERE a.investor_id=o.investor_id AND a.period_of_report=o.period_of_report AND a.is_amendment IS TRUE)
UNION ALL
SELECT a.report_id,f.id,a.investor_id,a.period_of_report
FROM amended a JOIN public.investors i ON i.id=a.investor_id AND i.is_active IS TRUE
JOIN public.filings f ON f.investor_id=a.investor_id AND f.period_of_report=a.period_of_report
WHERE (a.last_restatement=0 AND f.is_amendment IS FALSE)
  OR (f.is_amendment IS TRUE AND f.amendment_number>=greatest(a.last_restatement,1));
NOTIFY pgrst,'reload schema';
