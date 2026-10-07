BEGIN;
DO $test$
DECLARE investor_key text:='amendment-audit-'||gen_random_uuid();
  original_key text:=gen_random_uuid()::text; amendment_key text:=gen_random_uuid()::text;
  rows jsonb:='[{"row_index":0,"cusip":"023135106","issuer_name":"Fixture","title_of_class":"COM","quantity_type":"SH","quantity":5,"value_usd":10}]';
  rejected boolean;
BEGIN
  INSERT INTO investors(id,display_name,is_active) VALUES(investor_key,'Isolated amendment fixture',true);
  INSERT INTO filings(id,investor_id,period_of_report,filing_date,filing_url,is_amendment)
  VALUES(original_key,investor_key,'2026-06-30','2026-08-14','https://www.sec.gov/Archives/edgar/data/1/000000000000000001/',false),
    (amendment_key,investor_key,'2026-06-30','2026-08-15','https://www.sec.gov/Archives/edgar/data/1/000000000000000002/',true);
  PERFORM replace_sec13f_filing(original_key,rows,1,10,10,1,'ORIGINAL',null);
  rejected:=false;
  BEGIN
    PERFORM replace_sec13f_positions_with_summary(amendment_key,rows,1,10,10,1);
  EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Unclassified amendment accepted'; END IF;
  rejected:=false;
  BEGIN
    PERFORM replace_sec13f_filing(amendment_key,rows,2,10,10,1,'RESTATEMENT',1);
  EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected OR EXISTS(SELECT 1 FROM filings WHERE id=amendment_key AND amendment_type IS NOT NULL) THEN
    RAISE EXCEPTION 'Failed positions import did not roll metadata back';
  END IF;
  rejected:=false;
  BEGIN
    PERFORM replace_sec13f_filing(amendment_key,rows,1,10,10,1,'ORIGINAL',null);
  EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Cached amendment identity ignored'; END IF;
  PERFORM replace_sec13f_filing(amendment_key,rows,1,10,10,1,'RESTATEMENT',1);
  PERFORM replace_sec13f_filing(amendment_key,rows,1,10,10,1,'RESTATEMENT',1);
  IF (SELECT count(*) FROM sec13f_positions WHERE filing_id=amendment_key)<>1
    OR (SELECT count(*) FROM sec13f_positions WHERE filing_id=original_key)<>1 THEN
    RAISE EXCEPTION 'Import duplicated amendment rows or overwrote original document';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM filings WHERE id=amendment_key AND amendment_type='RESTATEMENT'
    AND amendment_number=1 AND positions_status='parsed') THEN RAISE EXCEPTION 'Metadata missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM vw_sec13f_verified_reports WHERE investor_id=investor_key AND verified_value_usd=10) THEN
    RAISE EXCEPTION 'Complete restatement was not published';
  END IF;
END;$test$;
ROLLBACK;
SELECT 'Passed: atomic metadata, identity, idempotence, raw source preservation and complete restatement' AS result;
