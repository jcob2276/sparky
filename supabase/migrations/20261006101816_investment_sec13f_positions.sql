ALTER TABLE public.filings
  ADD COLUMN IF NOT EXISTS positions_status text NOT NULL DEFAULT 'pending'
    CHECK (positions_status IN ('pending','parsed','error')),
  ADD COLUMN IF NOT EXISTS positions_error text,
  ADD COLUMN IF NOT EXISTS positions_parsed_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_entry_count integer,
  ADD COLUMN IF NOT EXISTS verified_value_usd numeric;

CREATE TABLE public.sec13f_positions (
  filing_id text NOT NULL REFERENCES public.filings(id) ON DELETE CASCADE,
  row_index integer NOT NULL CHECK (row_index >= 0),
  cusip text NOT NULL,
  issuer_name text NOT NULL,
  title_of_class text NOT NULL,
  quantity_type text NOT NULL CHECK (quantity_type IN ('SH','PRN')),
  put_call text CHECK (put_call IN ('PUT','CALL')),
  quantity numeric NOT NULL CHECK (quantity >= 0),
  value_usd numeric NOT NULL CHECK (value_usd >= 0),
  PRIMARY KEY (filing_id,row_index)
);
ALTER TABLE public.sec13f_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sec13f_positions_read ON public.sec13f_positions FOR SELECT TO anon,authenticated USING (true);
GRANT SELECT ON public.sec13f_positions TO anon,authenticated;
GRANT ALL ON public.sec13f_positions TO service_role;
CREATE INDEX sec13f_positions_cusip ON public.sec13f_positions(cusip,filing_id);

CREATE OR REPLACE FUNCTION public.replace_sec13f_positions(p_filing_id text,p_positions jsonb,p_entry_count integer,p_total_value_usd numeric)
RETURNS integer LANGUAGE plpgsql SET search_path=public AS $fn$
DECLARE target public.filings%ROWTYPE;
BEGIN
  SELECT * INTO STRICT target FROM public.filings WHERE id=p_filing_id FOR UPDATE;
  IF target.is_amendment IS DISTINCT FROM false OR target.filing_url !~ '^https://www\.sec\.gov/Archives/edgar/data/[0-9]+/[0-9]{18}/$'
    OR jsonb_typeof(p_positions) IS DISTINCT FROM 'array' OR jsonb_array_length(p_positions) <> p_entry_count
    OR abs(coalesce((SELECT sum((x->>'value_usd')::numeric) FROM jsonb_array_elements(p_positions)x),0)-p_total_value_usd)>0.000001 THEN
    RAISE EXCEPTION 'Invalid verified SEC 13F positions';
  END IF;
  DELETE FROM public.sec13f_positions WHERE filing_id=p_filing_id;
  INSERT INTO public.sec13f_positions(filing_id,row_index,cusip,issuer_name,title_of_class,quantity_type,put_call,quantity,value_usd)
  SELECT p_filing_id,row_index,cusip,issuer_name,title_of_class,quantity_type,put_call,quantity,value_usd
  FROM jsonb_to_recordset(p_positions) AS x(row_index integer,cusip text,issuer_name text,title_of_class text,
    quantity_type text,put_call text,quantity numeric,value_usd numeric);
  UPDATE public.filings SET positions_status='parsed',positions_error=NULL,positions_parsed_at=now(),
    verified_entry_count=p_entry_count,verified_value_usd=p_total_value_usd WHERE id=p_filing_id;
  RETURN p_entry_count;
END;$fn$;
REVOKE ALL ON FUNCTION public.replace_sec13f_positions(text,jsonb,integer,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_sec13f_positions(text,jsonb,integer,numeric) TO service_role;

CREATE VIEW public.vw_sec13f_company_history WITH (security_invoker=true) AS
WITH mapping AS (
  SELECT cusip,min(ticker) AS ticker FROM public.vw_consensus WHERE cusip IS NOT NULL AND ticker IS NOT NULL
  GROUP BY cusip HAVING count(DISTINCT ticker)=1
), latest AS (
  SELECT DISTINCT ON (investor_id,period_of_report) id,investor_id,period_of_report,filing_date,filing_url
  FROM public.filings WHERE positions_status='parsed' AND is_amendment=false
  ORDER BY investor_id,period_of_report,filing_date DESC,id
), positions AS (
  SELECT m.ticker,f.investor_id,f.period_of_report,f.filing_date,f.filing_url,
    sum(p.quantity) AS shares,sum(p.value_usd) AS value_usd
  FROM public.sec13f_positions p JOIN latest f ON f.id=p.filing_id JOIN mapping m ON m.cusip=p.cusip
  WHERE p.quantity_type='SH' AND p.put_call IS NULL
  GROUP BY m.ticker,f.investor_id,f.period_of_report,f.filing_date,f.filing_url
)
SELECT ticker,period_of_report,count(DISTINCT investor_id)::integer AS reported_holders,
  sum(shares) AS reported_shares,sum(value_usd) AS reported_value_usd,
  max(filing_date) AS latest_filing_date,jsonb_agg(DISTINCT filing_url) AS source_urls
FROM positions GROUP BY ticker,period_of_report;
GRANT SELECT ON public.vw_sec13f_company_history TO anon,authenticated;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.filings FROM PUBLIC,anon,authenticated;
