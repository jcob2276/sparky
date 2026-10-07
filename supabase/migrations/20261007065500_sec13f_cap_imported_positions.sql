-- Cap imported SEC 13F positions to top 100 by value_usd per filing.
-- The function still audits and verifies total filing reconciliation against
-- reported_cover_value_usd, but only persists the top 100 holdings to prevent
-- quant mega-funds (Citadel, AQR, Millennium) from exhausting DB storage.

CREATE OR REPLACE FUNCTION public.replace_sec13f_positions_with_summary(
  p_filing_id text,p_positions jsonb,p_entry_count integer,p_total_value_usd numeric,
  p_reported_cover_value_usd numeric,p_value_unit_usd integer)
RETURNS integer LANGUAGE plpgsql SET search_path=public SET statement_timeout='30s' AS $fn$
DECLARE target public.filings%ROWTYPE;
BEGIN
  SELECT * INTO STRICT target FROM public.filings WHERE id=p_filing_id FOR UPDATE;
  IF ((target.is_amendment IS FALSE AND target.amendment_type='ORIGINAL')
    OR (target.is_amendment IS TRUE AND target.amendment_type IN ('RESTATEMENT','NEW HOLDINGS') AND target.amendment_number>0)) IS NOT TRUE
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
  FROM (
    SELECT row_index,cusip,issuer_name,title_of_class,quantity_type,put_call,quantity,value_usd
    FROM jsonb_to_recordset(p_positions) AS x(row_index integer,cusip text,issuer_name text,title_of_class text,
      quantity_type text,put_call text,quantity numeric,value_usd numeric)
    ORDER BY value_usd DESC, row_index ASC
    LIMIT 100
  ) sub;
  UPDATE public.filings SET positions_status='parsed',positions_error=NULL,positions_parsed_at=now(),
    verified_entry_count=p_entry_count,verified_value_usd=p_total_value_usd,
    reported_cover_value_usd=p_reported_cover_value_usd,value_unit_usd=p_value_unit_usd,
    value_difference_usd=p_total_value_usd-p_reported_cover_value_usd,
    value_reconciliation=CASE WHEN p_total_value_usd=p_reported_cover_value_usd THEN 'exact' ELSE 'rounding_difference' END
  WHERE id=p_filing_id;
  RETURN p_entry_count;
END;$fn$;
