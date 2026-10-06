ALTER TABLE public.filings
  ADD COLUMN reported_cover_value_usd numeric,
  ADD COLUMN value_difference_usd numeric,
  ADD COLUMN value_unit_usd integer CHECK (value_unit_usd IN (1,1000)),
  ADD COLUMN value_reconciliation text NOT NULL DEFAULT 'not_recorded'
    CHECK (value_reconciliation IN ('not_recorded','exact','rounding_difference'));

CREATE FUNCTION public.replace_sec13f_positions_with_summary(
  p_filing_id text,p_positions jsonb,p_entry_count integer,p_total_value_usd numeric,
  p_reported_cover_value_usd numeric,p_value_unit_usd integer)
RETURNS integer LANGUAGE plpgsql SET search_path=public AS $fn$
DECLARE target public.filings%ROWTYPE;
BEGIN
  SELECT * INTO STRICT target FROM public.filings WHERE id=p_filing_id FOR UPDATE;
  IF target.is_amendment IS DISTINCT FROM false
    OR target.filing_url !~ '^https://www\.sec\.gov/Archives/edgar/data/[0-9]+/[0-9]{18}/$'
    OR p_entry_count IS NULL OR p_entry_count<0
    OR p_total_value_usd IS NULL OR p_total_value_usd<0 OR p_total_value_usd>9007199254740991
    OR p_reported_cover_value_usd IS NULL OR p_reported_cover_value_usd<0 OR p_reported_cover_value_usd>9007199254740991
    OR p_value_unit_usd IS NULL OR p_value_unit_usd NOT IN (1,1000)
    OR jsonb_typeof(p_positions) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_positions)<>p_entry_count
    OR abs(coalesce((SELECT sum((x->>'value_usd')::numeric) FROM jsonb_array_elements(p_positions)x),0)-p_total_value_usd)>0.000001
    OR abs(p_total_value_usd-p_reported_cover_value_usd)>(p_entry_count+1)::numeric*p_value_unit_usd/2 THEN
    RAISE EXCEPTION 'Invalid SEC 13F positions or summary reconciliation';
  END IF;
  DELETE FROM public.sec13f_positions WHERE filing_id=p_filing_id;
  INSERT INTO public.sec13f_positions(filing_id,row_index,cusip,issuer_name,title_of_class,quantity_type,put_call,quantity,value_usd)
  SELECT p_filing_id,row_index,cusip,issuer_name,title_of_class,quantity_type,put_call,quantity,value_usd
  FROM jsonb_to_recordset(p_positions) AS x(row_index integer,cusip text,issuer_name text,title_of_class text,
    quantity_type text,put_call text,quantity numeric,value_usd numeric);
  UPDATE public.filings SET positions_status='parsed',positions_error=NULL,positions_parsed_at=now(),
    verified_entry_count=p_entry_count,verified_value_usd=p_total_value_usd,
    reported_cover_value_usd=p_reported_cover_value_usd,value_unit_usd=p_value_unit_usd,
    value_difference_usd=p_total_value_usd-p_reported_cover_value_usd,
    value_reconciliation=CASE WHEN p_total_value_usd=p_reported_cover_value_usd THEN 'exact' ELSE 'rounding_difference' END
  WHERE id=p_filing_id;
  RETURN p_entry_count;
END;$fn$;
REVOKE ALL ON FUNCTION public.replace_sec13f_positions_with_summary(text,jsonb,integer,numeric,numeric,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_sec13f_positions_with_summary(text,jsonb,integer,numeric,numeric,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.replace_sec13f_positions(p_filing_id text,p_positions jsonb,p_entry_count integer,p_total_value_usd numeric)
RETURNS integer LANGUAGE plpgsql SET search_path=public AS $fn$
BEGIN
  RETURN public.replace_sec13f_positions_with_summary(p_filing_id,p_positions,p_entry_count,p_total_value_usd,p_total_value_usd,1);
END;$fn$;

CREATE OR REPLACE VIEW public.vw_sec13f_company_history WITH (security_invoker=true) AS
SELECT h.ticker,h.period_of_report,count(DISTINCT h.investor_id)::integer AS reported_holders,
  sum(h.shares) AS reported_shares,sum(h.value_usd) AS reported_value_usd,
  max(h.filing_date) AS latest_filing_date,jsonb_agg(DISTINCT h.filing_url) AS source_urls,
  coalesce(jsonb_agg(DISTINCT jsonb_build_object(
    'source_url',h.filing_url,'reported_total_usd',f.reported_cover_value_usd,
    'computed_total_usd',f.verified_value_usd,'difference_usd',f.value_difference_usd
  )) FILTER (WHERE f.value_reconciliation='rounding_difference'),'[]'::jsonb) AS summary_warnings
FROM public.vw_sec13f_verified_holdings h
JOIN public.vw_sec13f_verified_reports r ON r.investor_id=h.investor_id AND r.period_of_report=h.period_of_report
JOIN public.filings f ON f.id=r.id
GROUP BY h.ticker,h.period_of_report;
