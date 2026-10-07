-- Store amendment documents separately. Publication remains gated until the
-- complete amendment chain is reconciled; raw source rows are never merged here.
ALTER TABLE public.filings ADD COLUMN amendment_type text,
  ADD COLUMN amendment_number integer;
UPDATE public.filings SET amendment_type='ORIGINAL' WHERE is_amendment IS FALSE;
ALTER TABLE public.filings ADD CONSTRAINT filings_amendment_metadata CHECK (
  (amendment_type IS NULL AND amendment_number IS NULL)
  OR (is_amendment IS FALSE AND amendment_type IS NOT NULL AND amendment_type='ORIGINAL' AND amendment_number IS NULL)
  OR (is_amendment IS TRUE AND amendment_type IS NOT NULL AND amendment_type IN ('RESTATEMENT','NEW HOLDINGS')
    AND amendment_number IS NOT NULL AND amendment_number>0));
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

CREATE FUNCTION public.replace_sec13f_filing(
  p_filing_id text,p_positions jsonb,p_entry_count integer,p_total_value_usd numeric,
  p_reported_cover_value_usd numeric,p_value_unit_usd integer,
  p_amendment_type text,p_amendment_number integer)
RETURNS integer LANGUAGE plpgsql SET search_path=public SET statement_timeout='30s' AS $fn$
DECLARE target public.filings%ROWTYPE;
BEGIN
  SELECT * INTO STRICT target FROM public.filings WHERE id=p_filing_id FOR UPDATE;
  IF (
    (target.is_amendment IS FALSE AND p_amendment_type='ORIGINAL' AND p_amendment_number IS NULL)
    OR (target.is_amendment IS TRUE AND p_amendment_type IN ('RESTATEMENT','NEW HOLDINGS')
      AND p_amendment_number IS NOT NULL AND p_amendment_number>0)) IS NOT TRUE THEN
    RAISE EXCEPTION 'Invalid SEC 13F amendment identity or metadata';
  END IF;
  UPDATE public.filings SET amendment_type=p_amendment_type,amendment_number=p_amendment_number WHERE id=p_filing_id;
  RETURN public.replace_sec13f_positions_with_summary(p_filing_id,p_positions,p_entry_count,p_total_value_usd,
    p_reported_cover_value_usd,p_value_unit_usd);
END;$fn$;
REVOKE ALL ON FUNCTION public.replace_sec13f_filing(text,jsonb,integer,numeric,numeric,integer,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_sec13f_filing(text,jsonb,integer,numeric,numeric,integer,text,integer) TO service_role;
SELECT cron.schedule('sync-sec13f-positions','*/5 * * * *',$job$
  SELECT net.http_post(
    url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=sec_13f',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (
      SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vanguard_cron_service_role_key' LIMIT 1
    )),body := '{"limit":10}'::jsonb,timeout_milliseconds := 90000
  ) WHERE EXISTS (SELECT 1 FROM public.filings WHERE positions_status='pending');
$job$);
NOTIFY pgrst,'reload schema';
