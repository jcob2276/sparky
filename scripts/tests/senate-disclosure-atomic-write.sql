BEGIN;
DO $test$
DECLARE doc uuid:=gen_random_uuid();
DECLARE source_url text;
DECLARE trades jsonb;
DECLARE failed boolean:=false;
BEGIN
 source_url:='https://efdsearch.senate.gov/search/view/ptr/'||doc::text||'/';
 INSERT INTO public.senate_disclosures(id,source_url) VALUES(doc,source_url);
 trades:=jsonb_build_array(jsonb_build_object('id','senate-efd-'||doc::text||'-1',
 'external_id','senate-efd|'||doc::text||'|1','source','senate_efd','source_url',source_url,
 'filer_name','Fixture Senator','chamber','senate','ticker','TEST','asset_description','Fixture asset',
 'transaction_date','2026-09-01','disclosure_date','2026-09-15','transaction_type','buy',
 'owner','spouse','amount_low',1001,'amount_high',15000));
 PERFORM public.replace_senate_disclosure(doc,'Fixture Senator','2026-09-15',trades);
 PERFORM public.replace_senate_disclosure(doc,'Fixture Senator','2026-09-15',trades);
 IF (SELECT count(*) FROM public.stock_act_trades WHERE external_id='senate-efd|'||doc::text||'|1')<>1 THEN
 RAISE EXCEPTION 'Duplicate Senate disclosure import'; END IF;
 BEGIN
 PERFORM public.replace_senate_disclosure(doc,'Fixture Senator','2026-09-15',
 jsonb_set(trades,'{0,source_url}','"https://example.com/report"'));
 EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Accepted false Senate source'; END IF;
 IF (SELECT count(*) FROM public.stock_act_trades WHERE external_id='senate-efd|'||doc::text||'|1')<>1 THEN
 RAISE EXCEPTION 'Failed import removed verified row'; END IF;
 IF has_function_privilege('anon','public.replace_senate_disclosure(uuid,text,date,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.replace_senate_disclosure(uuid,text,date,jsonb)','EXECUTE') THEN
 RAISE EXCEPTION 'Public Senate writer privilege'; END IF;
END;
$test$;
ROLLBACK;
