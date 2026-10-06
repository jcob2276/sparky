BEGIN;
DO $test$
DECLARE
  fund text := 'verify-sec13f-' || gen_random_uuid()::text;
  current_id text := fund || ':current';
  previous_id text := fund || ':previous';
  current_period date;
  previous_period date;
  row_data record;
BEGIN
  SELECT max(period_of_report) INTO current_period FROM public.vw_sec13f_verified_reports;
  previous_period := (date_trunc('quarter',current_period)-interval '1 day')::date;
  IF current_period IS NULL OR NOT EXISTS(SELECT 1 FROM public.vw_consensus WHERE ticker='NVDA' AND upper(cusip)='67066G104') THEN
    RAISE EXCEPTION 'SEC comparison verification requires an imported quarter and NVDA mapping';
  END IF;
  INSERT INTO public.investors(id,display_name,fund_name,cik) VALUES(fund,'Verification fixture','Verification fixture','0000000001');
  INSERT INTO public.filings(id,investor_id,accession_no,period_of_report,filing_date,filing_url)
  VALUES
    (previous_id,fund,'000000000000000001',previous_period,previous_period+30,'https://www.sec.gov/Archives/edgar/data/1/000000000000000001/'),
    (current_id,fund,'000000000000000002',current_period,current_period+30,'https://www.sec.gov/Archives/edgar/data/1/000000000000000002/');
  PERFORM public.replace_sec13f_positions(previous_id,
    '[{"row_index":0,"cusip":"67066G104","issuer_name":"Nvidia","title_of_class":"COM","quantity_type":"SH","put_call":null,"quantity":100,"value_usd":1000}]',1,1000);
  PERFORM public.replace_sec13f_positions_with_summary(current_id,
    '[{"row_index":0,"cusip":"67066G104","issuer_name":"Nvidia","title_of_class":"COM","quantity_type":"SH","put_call":null,"quantity":150,"value_usd":1500},
      {"row_index":1,"cusip":"67066G104","issuer_name":"Nvidia","title_of_class":"COM","quantity_type":"SH","put_call":"CALL","quantity":10000,"value_usd":2000},
      {"row_index":2,"cusip":"67066G104","issuer_name":"Nvidia","title_of_class":"NOTE","quantity_type":"PRN","put_call":null,"quantity":100000,"value_usd":3000}]',3,6500,6501,1);
  SELECT * INTO STRICT row_data FROM public.filings WHERE id=current_id;
  IF row_data.reported_cover_value_usd<>6501 OR row_data.verified_value_usd<>6500 OR row_data.value_difference_usd<>-1 THEN
    RAISE EXCEPTION 'SEC reconciliation changed reported positions or discarded the summary';
  END IF;
  BEGIN
    PERFORM public.replace_sec13f_positions_with_summary(current_id,
      '[{"row_index":0,"cusip":"67066G104","issuer_name":"Nvidia","title_of_class":"COM","quantity_type":"SH","quantity":150,"value_usd":1500}]',1,1500,1510,1);
    RAISE EXCEPTION 'SEC reconciliation accepted a discrepancy beyond the rounding bound';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Invalid SEC 13F positions or summary reconciliation' THEN RAISE; END IF;
  END;
  SELECT * INTO STRICT row_data FROM public.vw_sec13f_verified_changes WHERE investor_id=fund AND ticker='NVDA';
  IF row_data.shares_now<>150 OR row_data.shares_previous<>100 OR row_data.shares_delta<>50
    OR row_data.value_now<>1500 OR row_data.change_type<>'reported_increase'
    OR row_data.previous_filing_url NOT LIKE '%000000000000000001/' THEN
    RAISE EXCEPTION 'SEC comparison included options/bonds or lost source documents';
  END IF;
  UPDATE public.filings SET positions_status='error' WHERE id=previous_id;
  IF EXISTS(SELECT 1 FROM public.vw_sec13f_verified_changes WHERE investor_id=fund) THEN
    RAISE EXCEPTION 'SEC comparison treated missing previous evidence as zero';
  END IF;
  UPDATE public.filings SET positions_status='parsed',period_of_report=(date_trunc('quarter',previous_period)-interval '1 day')::date WHERE id=previous_id;
  IF EXISTS(SELECT 1 FROM public.vw_sec13f_verified_changes WHERE investor_id=fund) THEN
    RAISE EXCEPTION 'SEC comparison crossed a missing quarter';
  END IF;
  UPDATE public.filings SET period_of_report=previous_period WHERE id=previous_id;
  PERFORM public.replace_sec13f_positions(current_id,'[]',0,0);
  SELECT * INTO STRICT row_data FROM public.vw_sec13f_verified_changes WHERE investor_id=fund AND ticker='NVDA';
  IF row_data.change_type<>'reported_absent' OR row_data.shares_now<>0 OR row_data.shares_delta<>-100 THEN
    RAISE EXCEPTION 'SEC comparison lost an absent reported position';
  END IF;
  INSERT INTO public.filings(id,investor_id,accession_no,period_of_report,filing_date,filing_url,is_amendment)
  VALUES(fund || ':amendment',fund,'000000000000000003',current_period,current_period+31,
    'https://www.sec.gov/Archives/edgar/data/1/000000000000000003/',true);
  IF EXISTS(SELECT 1 FROM public.vw_sec13f_verified_reports WHERE investor_id=fund AND period_of_report=current_period)
    OR EXISTS(SELECT 1 FROM public.vw_sec13f_verified_changes WHERE investor_id=fund) THEN
    RAISE EXCEPTION 'SEC comparison used an unreconciled amended report';
  END IF;
END;$test$;
ROLLBACK;
SELECT 'SEC comparison invariants passed; fixtures rolled back' AS verification;
