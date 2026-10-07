CREATE TABLE public.senate_disclosures (
  id uuid PRIMARY KEY,
  source_url text NOT NULL UNIQUE,
  filer_name text,
  filing_date date,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  parsed_at timestamptz,
  parse_status text NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending','parsed','error')),
  parse_error text,
  transaction_count integer,
  CHECK (source_url = 'https://efdsearch.senate.gov/search/view/ptr/' || id::text || '/')
);
ALTER TABLE public.senate_disclosures ENABLE ROW LEVEL SECURITY;
CREATE POLICY senate_disclosures_read ON public.senate_disclosures FOR SELECT TO anon,authenticated USING (true);
GRANT SELECT ON public.senate_disclosures TO anon,authenticated;
GRANT ALL ON public.senate_disclosures TO service_role;

CREATE OR REPLACE FUNCTION public.replace_senate_disclosure(
  p_document_id uuid, p_filer_name text, p_filing_date date, p_trades jsonb
) RETURNS integer LANGUAGE plpgsql SET search_path='' SET statement_timeout='30s' AS $function$
DECLARE disclosure public.senate_disclosures%ROWTYPE;
DECLARE inserted integer;
BEGIN
  SELECT * INTO STRICT disclosure FROM public.senate_disclosures WHERE id=p_document_id FOR UPDATE;
  IF nullif(trim(p_filer_name),'') IS NULL OR p_filing_date IS NULL
    OR (disclosure.filing_date IS NOT NULL AND disclosure.filing_date<>p_filing_date)
    OR jsonb_typeof(p_trades) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_trades) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Invalid Senate disclosure metadata';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_trades) WITH ORDINALITY AS row(t,n) WHERE
      t->>'id' IS DISTINCT FROM ('senate-efd-'||p_document_id::text||'-'||n::text) OR
      t->>'external_id' IS DISTINCT FROM ('senate-efd|'||p_document_id::text||'|'||n::text) OR
      t->>'source' IS DISTINCT FROM 'senate_efd' OR
      t->>'source_url' IS DISTINCT FROM disclosure.source_url OR
      t->>'filer_name' IS DISTINCT FROM p_filer_name OR t->>'chamber' IS DISTINCT FROM 'senate' OR
      (t->>'disclosure_date')::date IS DISTINCT FROM p_filing_date OR
      (t->>'transaction_date')::date IS NULL OR (t->>'transaction_date')::date>p_filing_date OR
      nullif(trim(t->>'asset_description'),'') IS NULL OR
      t->>'transaction_type' IS NULL OR t->>'transaction_type' NOT IN ('buy','sell','exchange','other') OR
      (t->>'amount_low')::numeric IS NULL OR (t->>'amount_low')::numeric<=0 OR
      ((t->>'amount_high')::numeric IS NOT NULL AND (t->>'amount_high')::numeric<(t->>'amount_low')::numeric)
  ) THEN RAISE EXCEPTION 'Invalid Senate transaction provenance or values'; END IF;
  DELETE FROM public.stock_act_trades WHERE
    (source='senate_efd' AND external_id LIKE ('senate-efd|'||p_document_id::text||'|%'))
    OR (source='senate_stock_watcher' AND external_id=disclosure.source_url);
  INSERT INTO public.stock_act_trades
    (id,politician_id,ticker,asset_description,transaction_date,disclosure_date,
     transaction_type,amount_low,amount_high,source,external_id,filer_name,chamber,owner,source_url)
  SELECT id,politician_id,ticker,asset_description,transaction_date,disclosure_date,
    transaction_type,amount_low,amount_high,source,external_id,filer_name,chamber,owner,source_url
  FROM jsonb_populate_recordset(NULL::public.stock_act_trades,p_trades);
  GET DIAGNOSTICS inserted=ROW_COUNT;
  UPDATE public.senate_disclosures SET filer_name=p_filer_name,filing_date=p_filing_date,
    parsed_at=now(),parse_status='parsed',parse_error=NULL,transaction_count=inserted WHERE id=p_document_id;
  RETURN inserted;
END;
$function$;
REVOKE ALL ON FUNCTION public.replace_senate_disclosure(uuid,text,date,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_senate_disclosure(uuid,text,date,jsonb) TO service_role;

-- Mirrors may supply document locations, never transaction values or filing dates.
INSERT INTO public.senate_disclosures(id,source_url)
SELECT DISTINCT substring(external_id FROM '/ptr/([a-f0-9-]{36})/')::uuid, external_id
FROM public.stock_act_trades WHERE source='senate_stock_watcher'
AND external_id ~ '^https://efdsearch[.]senate[.]gov/search/view/ptr/[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}/$'
ON CONFLICT DO NOTHING;

-- Update the existing importer job with service-only authentication.
SELECT cron.schedule('sync-senate-trades','*/30 * * * *',$cron$
  SELECT net.http_post(
    url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=senate',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vanguard_cron_service_role_key' LIMIT 1)),
    body := '{"limit":3}'::jsonb, timeout_milliseconds := 60000
  );
$cron$);
