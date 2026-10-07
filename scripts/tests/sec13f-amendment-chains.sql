BEGIN;
DO $test$
DECLARE investor_key text:='chain-audit-'||gen_random_uuid(); original_key text:=gen_random_uuid()::text;
  first_key text:=gen_random_uuid()::text; second_key text:=gen_random_uuid()::text; third_key text:=gen_random_uuid()::text;
  rows jsonb:='[{"row_index":0,"cusip":"023135106","issuer_name":"Fixture","title_of_class":"COM","quantity_type":"SH","quantity":5,"value_usd":10}]';
BEGIN
  INSERT INTO investors(id,display_name,is_active) VALUES(investor_key,'Isolated amendment chain',true);
  INSERT INTO filings(id,investor_id,period_of_report,filing_date,filing_url,is_amendment)
  VALUES(original_key,investor_key,'2026-06-30','2026-08-14','https://www.sec.gov/Archives/edgar/data/1/000000000000000001/',false);
  PERFORM replace_sec13f_filing(original_key,rows,1,10,10,1,'ORIGINAL',null);
  INSERT INTO filings(id,investor_id,period_of_report,filing_date,filing_url,is_amendment)
  VALUES(first_key,investor_key,'2026-06-30','2026-08-15','https://www.sec.gov/Archives/edgar/data/1/000000000000000002/',true);
  IF EXISTS(SELECT 1 FROM vw_sec13f_verified_reports WHERE investor_id=investor_key) THEN
    RAISE EXCEPTION 'Pending amendment did not block publication'; END IF;
  PERFORM replace_sec13f_filing(first_key,rows,1,10,10,1,'NEW HOLDINGS',1);
  IF NOT EXISTS(SELECT 1 FROM vw_sec13f_fund_positions WHERE investor_id=investor_key AND shares=10 AND value_usd=20)
    OR NOT EXISTS(SELECT 1 FROM vw_sec13f_fund_reports WHERE investor_id=investor_key
      AND verified_value_usd=20 AND verified_entry_count=2 AND filing_date='2026-08-15' AND jsonb_array_length(source_urls)=2) THEN
    RAISE EXCEPTION 'New holdings did not supplement original with full source metadata'; END IF;
  INSERT INTO filings(id,investor_id,period_of_report,filing_date,filing_url,is_amendment)
  VALUES(second_key,investor_key,'2026-06-30','2026-08-16','https://www.sec.gov/Archives/edgar/data/1/000000000000000003/',true);
  PERFORM replace_sec13f_filing(second_key,rows,1,10,10,1,'RESTATEMENT',2);
  IF NOT EXISTS(SELECT 1 FROM vw_sec13f_fund_positions WHERE investor_id=investor_key AND shares=5 AND value_usd=10)
    OR (SELECT count(*) FROM vw_sec13f_report_documents WHERE investor_id=investor_key)<>1 THEN
    RAISE EXCEPTION 'Restatement retained superseded original/additions'; END IF;
  INSERT INTO filings(id,investor_id,period_of_report,filing_date,filing_url,is_amendment)
  VALUES(third_key,investor_key,'2026-06-30','2026-08-17','https://www.sec.gov/Archives/edgar/data/1/000000000000000004/',true);
  PERFORM replace_sec13f_filing(third_key,rows,1,10,10,1,'NEW HOLDINGS',3);
  IF NOT EXISTS(SELECT 1 FROM vw_sec13f_fund_positions WHERE investor_id=investor_key AND shares=10 AND value_usd=20) THEN
    RAISE EXCEPTION 'Addition after restatement failed'; END IF;
  UPDATE filings SET amendment_number=4 WHERE id=third_key;
  IF EXISTS(SELECT 1 FROM vw_sec13f_verified_reports WHERE investor_id=investor_key) THEN
    RAISE EXCEPTION 'Missing amendment sequence accepted'; END IF;
  UPDATE filings SET amendment_number=2 WHERE id=third_key;
  IF EXISTS(SELECT 1 FROM vw_sec13f_verified_reports WHERE investor_id=investor_key) THEN
    RAISE EXCEPTION 'Duplicate amendment number accepted'; END IF;
  UPDATE filings SET amendment_number=3,filing_date='2026-08-14' WHERE id=third_key;
  IF EXISTS(SELECT 1 FROM vw_sec13f_verified_reports WHERE investor_id=investor_key) THEN
    RAISE EXCEPTION 'Nonchronological amendment chain accepted'; END IF;
  IF (SELECT count(*) FROM sec13f_positions WHERE filing_id IN(original_key,first_key,second_key,third_key))<>4 THEN
    RAISE EXCEPTION 'Raw documents lost during reconciliation'; END IF;
END;$test$;
ROLLBACK;
SELECT 'Passed: additions, restatements, follow-up additions, missing/duplicate/order gates and preserved sources' AS result;
