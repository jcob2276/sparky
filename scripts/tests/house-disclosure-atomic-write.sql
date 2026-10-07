BEGIN;
DO $test$
DECLARE payload jsonb; count_rows integer;
BEGIN
  INSERT INTO public.house_disclosures(id,doc_id,year,filer_name,filing_date,source_url)
  VALUES('house-test-atomic-write','9999999999',2026,'Fixture','2026-10-01',
    'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/9999999999.pdf');
  payload=jsonb_build_array(jsonb_build_object('id','house-test-trade','source','house_clerk',
    'external_id','house-clerk|9999999999|0',
    'source_url','https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/9999999999.pdf',
    'transaction_date','2026-09-01','disclosure_date','2026-10-01','transaction_type','buy','ticker','FIXTURE'));
  PERFORM public.replace_house_disclosure('house-test-atomic-write',payload);
  PERFORM public.replace_house_disclosure('house-test-atomic-write',payload);
  SELECT count(*) INTO count_rows FROM public.stock_act_trades WHERE id='house-test-trade';
  IF count_rows<>1 THEN RAISE EXCEPTION 'Document replacement duplicated trades'; END IF;
  BEGIN
    PERFORM public.replace_house_disclosure('house-test-atomic-write',
      jsonb_set(payload,'{0,source_url}','"https://invalid.example/document"'));
    RAISE EXCEPTION 'Unrelated source accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Invalid disclosure provenance' THEN RAISE; END IF;
  END;
  IF NOT EXISTS(SELECT 1 FROM public.stock_act_trades WHERE id='house-test-trade') THEN
    RAISE EXCEPTION 'Rejected response destroyed previous trades';
  END IF;
END;$test$;
ROLLBACK;
