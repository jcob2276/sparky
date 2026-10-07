BEGIN;
DO $test$
DECLARE before_count integer; after_count integer;
BEGIN
  SELECT count(*) INTO before_count FROM public.us_security_catalogue;
  IF before_count < 1000 THEN RAISE EXCEPTION 'Catalogue not populated'; END IF;
  BEGIN
    PERFORM public.replace_us_security_catalogue('[]'::jsonb,now());
    RAISE EXCEPTION 'Empty snapshot unexpectedly accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Incomplete SEC catalogue snapshot' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.replace_us_security_catalogue('{}'::jsonb,now());
    RAISE EXCEPTION 'Malformed snapshot unexpectedly accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Invalid SEC catalogue snapshot' THEN RAISE; END IF;
  END;
  SELECT count(*) INTO after_count FROM public.us_security_catalogue;
  IF before_count <> after_count THEN RAISE EXCEPTION 'Invalid response removed catalogue rows'; END IF;
  IF has_function_privilege('anon','public.replace_us_security_catalogue(jsonb,timestamptz)','EXECUTE')
    OR has_function_privilege('authenticated','public.replace_us_security_catalogue(jsonb,timestamptz)','EXECUTE') THEN
    RAISE EXCEPTION 'Public user can replace catalogue';
  END IF;
END;$test$;
SET LOCAL ROLE anon;
SELECT ticker,name,cik,exchange,source_url,checked_at FROM public.us_security_catalogue WHERE ticker='NVDA';
ROLLBACK;
