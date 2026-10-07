CREATE TABLE public.us_security_catalogue (
  ticker text PRIMARY KEY CHECK (ticker ~ '^[A-Z0-9][A-Z0-9.-]{0,24}$'),
  cik text NOT NULL CHECK (cik ~ '^[0-9]{10}$' AND cik <> '0000000000'),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 500),
  exchange text CHECK (exchange IS NULL OR length(trim(exchange)) BETWEEN 1 AND 100),
  source_url text NOT NULL DEFAULT 'https://www.sec.gov/files/company_tickers_exchange.json'
    CHECK (source_url='https://www.sec.gov/files/company_tickers_exchange.json'),
  checked_at timestamptz NOT NULL
);
COMMENT ON TABLE public.us_security_catalogue IS 'SEC discovery catalogue; presence does not certify current listing/tradability or 13F coverage.';
ALTER TABLE public.us_security_catalogue ENABLE ROW LEVEL SECURITY;
CREATE POLICY us_catalogue_read ON public.us_security_catalogue FOR SELECT TO anon,authenticated USING (true);
GRANT SELECT ON public.us_security_catalogue TO anon,authenticated;
GRANT ALL ON public.us_security_catalogue TO service_role;

CREATE FUNCTION public.replace_us_security_catalogue(p_rows jsonb,p_checked_at timestamptz)
RETURNS integer LANGUAGE plpgsql SET search_path=public SET statement_timeout='30s' AS $fn$
DECLARE inserted integer; previous_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('us_security_catalogue'));
  SELECT count(*) INTO previous_count FROM public.us_security_catalogue;
  IF p_checked_at IS NULL OR p_checked_at>now()+interval '5 minutes'
    OR jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid SEC catalogue snapshot'; END IF;
  IF jsonb_array_length(p_rows)<1000 OR jsonb_array_length(p_rows)<previous_count*0.8 THEN
    RAISE EXCEPTION 'Incomplete SEC catalogue snapshot';
  END IF;
  IF EXISTS(SELECT 1 FROM public.us_security_catalogue WHERE checked_at>=p_checked_at) THEN
    RETURN previous_count;
  END IF;
  INSERT INTO public.us_security_catalogue(ticker,cik,name,exchange,checked_at)
    SELECT ticker,cik,name,exchange,p_checked_at FROM jsonb_to_recordset(p_rows)
      AS r(ticker text,cik text,name text,exchange text)
    ON CONFLICT(ticker) DO UPDATE SET cik=excluded.cik,name=excluded.name,exchange=excluded.exchange,checked_at=excluded.checked_at;
  GET DIAGNOSTICS inserted=ROW_COUNT;
  DELETE FROM public.us_security_catalogue WHERE checked_at<p_checked_at;
  INSERT INTO public.investment_source_status(source,checked_at,last_success_at,status,error)
    VALUES('sec_us_catalogue',p_checked_at,p_checked_at,'ok',NULL)
    ON CONFLICT(source) DO UPDATE SET checked_at=excluded.checked_at,last_success_at=excluded.last_success_at,status='ok',error=NULL;
  RETURN inserted;
END;$fn$;
REVOKE ALL ON FUNCTION public.replace_us_security_catalogue(jsonb,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_us_security_catalogue(jsonb,timestamptz) TO service_role;
SELECT cron.schedule('sync-sec-us-catalogue','15 5 * * *',$job$
  SELECT net.http_post(
    url:='https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=us_catalogue',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(
      SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vanguard_cron_service_role_key' LIMIT 1
    )),body:='{}'::jsonb,timeout_milliseconds:=90000);
$job$);
NOTIFY pgrst,'reload schema';
