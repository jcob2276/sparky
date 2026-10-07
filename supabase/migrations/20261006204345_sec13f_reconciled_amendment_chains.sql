-- SEC: RESTATEMENT replaces the table; NEW HOLDINGS supplements it.
-- Accept only complete, uniquely numbered, chronological amendment chains.
-- https://www.sec.gov/files/edgar/filermanual/archive/edgarfm-vol2-v76.pdf
CREATE VIEW public.vw_sec13f_report_documents WITH (security_invoker=true) AS
WITH originals AS MATERIALIZED (
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
      AND (is_amendment IS FALSE OR
        (amendment_type IS NOT NULL AND amendment_type IN ('RESTATEMENT','NEW HOLDINGS') AND amendment_number>0))) AS complete,
    min(filing_date) FILTER(WHERE is_amendment IS TRUE) AS first_amendment_date
  FROM public.filings GROUP BY investor_id,period_of_report
), amended AS MATERIALIZED (
  SELECT o.id AS report_id,c.* FROM chains c JOIN originals o USING(investor_id,period_of_report)
  WHERE c.amendments>0 AND c.originals=1 AND c.complete IS TRUE
    AND c.numbers=ARRAY(SELECT generate_series(1,c.amendments))
    AND c.first_amendment_date>=o.filing_date
)
SELECT o.id AS report_id,o.id AS document_id,o.investor_id,o.period_of_report
FROM originals o JOIN public.investors i ON i.id=o.investor_id AND i.is_active IS TRUE
WHERE o.positions_status='parsed' AND NOT EXISTS(SELECT 1 FROM public.filings a
  WHERE a.investor_id=o.investor_id AND a.period_of_report=o.period_of_report AND a.is_amendment IS TRUE)
UNION ALL
SELECT a.report_id,f.id,a.investor_id,a.period_of_report
FROM amended a JOIN public.investors i ON i.id=a.investor_id AND i.is_active IS TRUE
JOIN public.filings f ON f.investor_id=a.investor_id AND f.period_of_report=a.period_of_report
WHERE (a.last_restatement=0 AND f.is_amendment IS FALSE)
  OR (f.is_amendment IS TRUE AND f.amendment_number>=greatest(a.last_restatement,1));

CREATE OR REPLACE VIEW public.vw_sec13f_verified_reports WITH (security_invoker=true) AS
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
    FILTER(WHERE f.value_reconciliation='rounding_difference'),'[]'::jsonb) AS summary_warnings
FROM public.vw_sec13f_report_documents d JOIN public.filings f ON f.id=d.document_id
GROUP BY d.report_id,d.investor_id,d.period_of_report;

CREATE VIEW public.vw_sec13f_effective_positions WITH (security_invoker=true) AS
SELECT d.report_id AS filing_id,p.row_index,p.cusip,p.issuer_name,p.title_of_class,p.quantity_type,
  p.put_call,p.quantity,p.value_usd,p.filing_id AS source_filing_id
FROM public.vw_sec13f_report_documents d JOIN public.sec13f_positions p ON p.filing_id=d.document_id;

CREATE OR REPLACE VIEW public.vw_sec13f_verified_holdings WITH (security_invoker=true) AS
WITH mapping AS (
  SELECT upper(cusip) AS cusip,min(ticker) AS ticker FROM public.vw_consensus
  WHERE cusip IS NOT NULL AND ticker IS NOT NULL GROUP BY upper(cusip) HAVING count(DISTINCT ticker)=1
)
SELECT m.ticker,f.investor_id,f.period_of_report,f.filing_date,f.filing_url,
  sum(p.quantity) AS shares,sum(p.value_usd) AS value_usd,f.source_urls
FROM public.vw_sec13f_effective_positions p JOIN public.vw_sec13f_verified_reports f ON f.id=p.filing_id
JOIN mapping m ON m.cusip=p.cusip WHERE p.quantity_type='SH' AND p.put_call IS NULL
GROUP BY m.ticker,f.investor_id,f.period_of_report,f.filing_date,f.filing_url,f.source_urls HAVING sum(p.quantity)>0;

CREATE OR REPLACE VIEW public.vw_sec13f_fund_reports WITH (security_invoker=true) AS
SELECT r.id,r.investor_id,r.period_of_report,r.filing_date,r.filing_url,r.verified_value_usd,
  r.verified_entry_count,r.value_reconciliation,r.source_urls,r.summary_warnings
FROM public.vw_sec13f_verified_reports r;

GRANT SELECT ON public.vw_sec13f_report_documents,public.vw_sec13f_effective_positions TO anon,authenticated,service_role;
-- Preserve the legacy original-only RPC for callers that omit metadata.
DO $compat$
DECLARE definition text;
BEGIN
  definition:=pg_get_functiondef('public.replace_sec13f_positions_with_summary(text,jsonb,integer,numeric,numeric,integer)'::regprocedure);
  definition:=replace(definition,'target.amendment_type=''ORIGINAL''','coalesce(target.amendment_type,''ORIGINAL'')=''ORIGINAL''');
  EXECUTE definition;
END;$compat$;
NOTIFY pgrst,'reload schema';

CREATE OR REPLACE VIEW public.vw_sec13f_fund_positions WITH (security_invoker=true) AS
WITH mapping AS MATERIALIZED (
  SELECT upper(cusip) AS cusip, min(ticker) AS ticker
  FROM public.vw_consensus WHERE cusip IS NOT NULL AND ticker IS NOT NULL
  GROUP BY upper(cusip) HAVING count(DISTINCT ticker)=1
), positions AS NOT MATERIALIZED (
  SELECT r.investor_id,r.period_of_report,r.filing_url,r.filing_date,p.cusip,
         p.issuer_name,p.quantity,p.value_usd
  FROM public.vw_sec13f_verified_reports r
  JOIN public.vw_sec13f_effective_positions p ON p.filing_id=r.id
  WHERE p.quantity_type='SH' AND p.put_call IS NULL
)
SELECT p.investor_id,p.period_of_report,p.filing_url,p.filing_date,p.cusip,
       m.ticker,min(p.issuer_name) AS company_name,
       sum(p.quantity) AS shares,sum(p.value_usd) AS value_usd
FROM positions p LEFT JOIN mapping m ON m.cusip=p.cusip
GROUP BY p.investor_id,p.period_of_report,p.filing_url,p.filing_date,p.cusip,m.ticker
HAVING sum(p.quantity)>0;


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
), snapshot AS MATERIALIZED (
  SELECT m.ticker,r.investor_id,r.period_of_report,r.filing_url,r.source_urls,
    sum(s.quantity) AS shares,sum(s.value_usd) AS value_usd
  FROM scoped r JOIN public.vw_sec13f_effective_positions s ON s.filing_id=r.id
  JOIN mapping m ON m.cusip=s.cusip
  WHERE s.quantity_type='SH' AND s.put_call IS NULL
  GROUP BY m.ticker,r.investor_id,r.period_of_report,r.filing_url,r.source_urls HAVING sum(s.quantity)>0
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

-- Avoid expanding the same verified-report gate twice for company history.
-- The outer ticker filter reaches the CUSIP index before per-report aggregation.
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
  FROM mapping m JOIN public.vw_sec13f_effective_positions p ON p.cusip=m.cusip
  JOIN reports r ON r.id=p.filing_id
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
  ,(SELECT jsonb_path_query_array(jsonb_agg(r.source_urls),'$[*][*]') FROM reports r
    WHERE r.investor_id=holdings.investor_id AND r.period_of_report IN(holdings.period_of_report,holdings.previous_period)) AS source_urls
FROM holdings;

CREATE OR REPLACE VIEW public.vw_sec13f_current_holdings WITH (security_invoker=true) AS SELECT * FROM public.vw_sec13f_verified_holdings WHERE period_of_report=(SELECT max(period_of_report) FROM public.vw_sec13f_verified_reports);
NOTIFY pgrst,'reload schema';
