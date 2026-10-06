BEGIN ISOLATION LEVEL REPEATABLE READ;
DO $test$
DECLARE investor_key text:='fund-audit-'||gen_random_uuid(); report_key text:=gen_random_uuid()::text;
BEGIN
  INSERT INTO investors(id,display_name,is_active) VALUES(investor_key,'Isolated fund fixture',true);
  INSERT INTO filings(id,investor_id,period_of_report,filing_date,filing_url,positions_status,
    verified_entry_count,verified_value_usd)
  VALUES(report_key,investor_key,'2026-06-30','2026-08-14','https://www.sec.gov/Archives/edgar/data/1/000000000000000001/','parsed',5,100);
  INSERT INTO sec13f_positions(filing_id,row_index,cusip,issuer_name,title_of_class,quantity_type,put_call,quantity,value_usd)
  VALUES(report_key,0,'TESTCUSIP','Actual issuer','COM','SH',null,2,10),
        (report_key,1,'TESTCUSIP','Actual issuer','COM','SH',null,3,20),
        (report_key,2,'OPTIONCUS','Option','COM','SH','CALL',100,30),
        (report_key,3,'PRNCUSIP','Debt','NOTE','PRN',null,100,40),
        (report_key,4,'ZEROCUSIP','Zero','COM','SH',null,0,0);
  IF (SELECT count(*) FROM vw_sec13f_fund_positions WHERE investor_id=investor_key)<>1 THEN
    RAISE EXCEPTION 'Options, PRN or zero-share rows leaked, or unmapped CUSIP was lost';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM vw_sec13f_fund_positions WHERE investor_id=investor_key
    AND cusip='TESTCUSIP' AND ticker IS NULL AND shares=5 AND value_usd=30) THEN
    RAISE EXCEPTION 'CUSIP aggregation corrupted shares or USD values';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM vw_sec13f_fund_reports WHERE investor_id=investor_key
    AND verified_entry_count=5 AND verified_value_usd=100) THEN
    RAISE EXCEPTION 'Report metadata replaced by partial SH basket';
  END IF;
  INSERT INTO filings(id,investor_id,period_of_report,is_amendment)
    VALUES(gen_random_uuid()::text,investor_key,'2026-06-30',true);
  IF EXISTS(SELECT 1 FROM vw_sec13f_fund_positions WHERE investor_id=investor_key)
     OR EXISTS(SELECT 1 FROM vw_sec13f_fund_reports WHERE investor_id=investor_key) THEN
    RAISE EXCEPTION 'Unreconciled amendment incorrectly accepted';
  END IF;
END;$test$;
ROLLBACK;
SELECT 'Passed: unmapped CUSIP, aggregation, options/PRN exclusion, report totals, amendment gate; fixture rolled back' AS result;
