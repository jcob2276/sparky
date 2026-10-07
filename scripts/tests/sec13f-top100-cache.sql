BEGIN;
SET LOCAL statement_timeout='15s';
DO $test$
DECLARE target text;
BEGIN
  SELECT d.document_id INTO target FROM public.vw_sec13f_cached_report_documents d
    JOIN public.filings f ON f.id=d.document_id WHERE f.verified_entry_count>100 LIMIT 1;
  IF target IS NULL THEN RAISE EXCEPTION 'No capped report published'; END IF;
  IF EXISTS(SELECT 1 FROM public.vw_sec13f_report_documents WHERE document_id=target) THEN
    RAISE EXCEPTION 'Capped report treated as complete';
  END IF;
  DELETE FROM public.sec13f_positions WHERE filing_id=target
    AND row_index=(SELECT min(row_index) FROM public.sec13f_positions WHERE filing_id=target);
  IF EXISTS(SELECT 1 FROM public.vw_sec13f_cached_report_documents WHERE document_id=target) THEN
    RAISE EXCEPTION 'Broken top100 cache published';
  END IF;
END;$test$;
ROLLBACK;
