BEGIN;
SET LOCAL statement_timeout='15s';
DO $test$
DECLARE target text; removed integer;
BEGIN
  SELECT document_id INTO target FROM public.vw_sec13f_report_documents d
    JOIN public.filings f ON f.id=d.document_id WHERE f.verified_entry_count>0 LIMIT 1;
  IF target IS NULL THEN RAISE EXCEPTION 'No complete report available for regression test'; END IF;
  DELETE FROM public.sec13f_positions WHERE filing_id=target
    AND row_index=(SELECT min(row_index) FROM public.sec13f_positions WHERE filing_id=target);
  GET DIAGNOSTICS removed=ROW_COUNT;
  IF removed<>1 THEN RAISE EXCEPTION 'Failed to simulate truncated storage'; END IF;
  IF EXISTS(SELECT 1 FROM public.vw_sec13f_report_documents WHERE document_id=target) THEN
    RAISE EXCEPTION 'Truncated stored report is still published';
  END IF;
END;$test$;
ROLLBACK;
