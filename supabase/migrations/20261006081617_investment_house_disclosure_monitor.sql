ALTER TABLE public.stock_act_trades
  ADD COLUMN IF NOT EXISTS filer_name text,
  ADD COLUMN IF NOT EXISTS chamber text,
  ADD COLUMN IF NOT EXISTS owner text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS notification_date date;

CREATE TABLE IF NOT EXISTS public.house_disclosures (
  id text PRIMARY KEY,
  doc_id text NOT NULL,
  year integer NOT NULL,
  filer_name text NOT NULL,
  filing_date date NOT NULL,
  source_url text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  parsed_at timestamptz,
  parse_status text NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending','parsed','error')),
  parse_error text,
  transaction_count integer,
  UNIQUE(year,doc_id)
);
ALTER TABLE public.house_disclosures ENABLE ROW LEVEL SECURITY;
CREATE POLICY house_disclosures_read ON public.house_disclosures FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.house_disclosures TO anon, authenticated;
GRANT ALL ON public.house_disclosures TO service_role;

CREATE TABLE IF NOT EXISTS public.investment_source_status (
  source text PRIMARY KEY,
  checked_at timestamptz NOT NULL,
  last_success_at timestamptz,
  latest_disclosure_date date,
  status text NOT NULL CHECK (status IN ('ok','partial','error')),
  error text
);
ALTER TABLE public.investment_source_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY investment_source_status_read ON public.investment_source_status FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.investment_source_status TO anon, authenticated;
GRANT ALL ON public.investment_source_status TO service_role;

-- Replace one document atomically: old mirrors must not duplicate newly parsed official rows.
CREATE OR REPLACE FUNCTION public.replace_house_disclosure(p_document_id text, p_trades jsonb)
RETURNS integer LANGUAGE plpgsql SET search_path = public AS $function$
DECLARE disclosure public.house_disclosures%ROWTYPE;
DECLARE inserted integer;
BEGIN
  SELECT * INTO STRICT disclosure FROM public.house_disclosures WHERE id = p_document_id FOR UPDATE;
  IF jsonb_typeof(p_trades) <> 'array' OR jsonb_array_length(p_trades) = 0 THEN
    RAISE EXCEPTION 'Parsed disclosure must contain transactions';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_trades) t WHERE
    t->>'source' IS DISTINCT FROM 'house_clerk' OR t->>'source_url' IS DISTINCT FROM disclosure.source_url OR
    COALESCE(t->>'external_id','') NOT LIKE ('house-clerk|' || disclosure.doc_id || '|%')) THEN
    RAISE EXCEPTION 'Invalid disclosure provenance';
  END IF;
  DELETE FROM public.stock_act_trades WHERE source = 'house_clerk'
    AND external_id LIKE ('house-clerk|' || disclosure.doc_id || '|%');
  INSERT INTO public.stock_act_trades
    (id,politician_id,ticker,asset_description,transaction_date,disclosure_date,
     transaction_type,amount_low,amount_high,source,external_id,filer_name,chamber,owner,source_url,notification_date)
  SELECT id,politician_id,ticker,asset_description,transaction_date,disclosure_date,
     transaction_type,amount_low,amount_high,source,external_id,filer_name,chamber,owner,source_url,notification_date
  FROM jsonb_populate_recordset(NULL::public.stock_act_trades,p_trades);
  GET DIAGNOSTICS inserted = ROW_COUNT;
  UPDATE public.house_disclosures SET parsed_at=now(), parse_status='parsed', parse_error=NULL,
    transaction_count=inserted WHERE id=p_document_id;
  RETURN inserted;
END;
$function$;
REVOKE ALL ON FUNCTION public.replace_house_disclosure(text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_house_disclosure(text,jsonb) TO service_role;
