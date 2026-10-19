-- Runnable against an isolated test database after the migration. All fixtures roll back.
BEGIN;
CREATE FUNCTION pg_temp.check_contract(ok boolean, description text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Contract failed: %', description; END IF; END;
$$;
INSERT INTO auth.users(id) VALUES ('10000000-0000-0000-0000-000000000001'), ('10000000-0000-0000-0000-000000000002');
INSERT INTO public.relations(name,is_singleton) VALUES ('test_singleton',true);
DO $$
DECLARE
  u uuid := '10000000-0000-0000-0000-000000000001';
  e1 uuid := '20000000-0000-0000-0000-000000000001';
  e2 uuid := '20000000-0000-0000-0000-000000000002';
  e3 uuid := '20000000-0000-0000-0000-000000000003';
  e4 uuid := '20000000-0000-0000-0000-000000000004';
  old_id uuid;
  new_id uuid;
BEGIN
  PERFORM public.upsert_vanguard_entity_link(u,' Test person ',p_relation=>'test_singleton',p_target=>'A',p_source_episode_id=>e1,p_observed_at=>'2026-01-01Z');
  SELECT id INTO old_id FROM public.vanguard_entity_links WHERE user_id=u AND target_entity='A';
  PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'test_singleton',p_target=>'A',p_source_episode_id=>e1,p_observed_at=>'2026-01-01Z');
  PERFORM pg_temp.check_contract((SELECT evidence_count=1 AND weight=1 FROM public.vanguard_entity_links WHERE id=old_id),'same observation is idempotent');
  PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'test_singleton',p_target=>'A',p_source_episode_id=>e2,p_observed_at=>'2026-01-02Z');
  PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'test_singleton',p_target=>'A',p_source_episode_id=>e1,p_observed_at=>'2026-01-01Z');
  PERFORM pg_temp.check_contract((SELECT evidence_count=2 AND source_observation_ids=ARRAY[e1,e2] FROM public.claims WHERE id=old_id),'updates append unique observations and replay older source does not inflate');
  PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'test_singleton',p_target=>'B',p_source_episode_id=>e3,p_observed_at=>'2026-01-03Z');
  SELECT id INTO new_id FROM public.vanguard_entity_links WHERE user_id=u AND target_entity='B';
  PERFORM pg_temp.check_contract((SELECT status='deprecated' AND superseded_by=new_id FROM public.vanguard_entity_links WHERE id=old_id),'singleton supersession');
  PERFORM pg_temp.check_contract((SELECT status='deprecated' AND superseded_by=new_id FROM public.claims WHERE id=old_id),'claim supersession');
  PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'test_singleton',p_target=>'A',p_source_episode_id=>e2,p_observed_at=>'2026-01-02Z');
  PERFORM pg_temp.check_contract((SELECT status='deprecated' AND evidence_count=2 FROM public.vanguard_entity_links WHERE id=old_id),'replay cannot reactivate deprecated fact');
  PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'test_singleton',p_target=>'Older',p_source_episode_id=>e4,p_observed_at=>'2025-01-01Z');
  PERFORM pg_temp.check_contract((SELECT status='historical' FROM public.vanguard_entity_links WHERE user_id=u AND target_entity='Older'),'backdated fact remains historical');
  PERFORM pg_temp.check_contract((SELECT status='active' FROM public.vanguard_entity_links WHERE id=new_id),'backdated fact preserves current link');
  PERFORM pg_temp.check_contract((SELECT status='active' FROM public.claims WHERE id=new_id),'backdated fact preserves current claim');
  PERFORM pg_temp.check_contract((SELECT c.superseded_by=new_id FROM public.claims c JOIN public.entities o ON o.id=c.object_id WHERE c.user_id=u AND o.canonical_name='Older'),'backdated claim retains successor pointer');
  PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'test_singleton',p_target=>'A',p_source_episode_id=>e4,p_observed_at=>'2026-01-04Z');
  PERFORM pg_temp.check_contract((SELECT evidence_count=3 AND source_observation_ids=ARRAY[e1,e2,e4] FROM public.claims WHERE id=old_id),'reactivation preserves cumulative provenance');
  PERFORM pg_temp.check_contract((SELECT count(*)=2 FROM public.claims c JOIN public.entities o ON o.id=c.object_id WHERE c.user_id=u AND o.canonical_name='A'),'reactivation preserves old claim history');
  PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'test_singleton',p_target=>'A',p_source_episode_id=>e1,p_observed_at=>'2026-01-05Z');
  PERFORM pg_temp.check_contract((SELECT evidence_count=3 FROM public.vanguard_entity_links WHERE id=old_id),'historical provenance still deduplicates after reactivation');
  PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'test_singleton',p_target=>'Older',p_source_episode_id=>e3,p_observed_at=>'2026-01-06Z');
  PERFORM pg_temp.check_contract((SELECT c.valid_from='2026-01-06Z'::timestamptz AND c.valid_to IS NULL FROM public.claims c JOIN public.entities o ON o.id=c.object_id WHERE c.user_id=u AND o.canonical_name='Older' AND c.status='active'),'historical reactivation starts current interval');
  PERFORM pg_temp.check_contract((SELECT count(*)=1 FROM public.claims c JOIN public.entities o ON o.id=c.object_id WHERE c.user_id=u AND o.canonical_name='Older' AND c.status='historical' AND c.valid_to IS NOT NULL),'historical reactivation retains closed interval');
  PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'multi',p_target=>'Old',p_observed_at=>'2026-01-01Z');
  SELECT id INTO old_id FROM public.vanguard_entity_links WHERE user_id=u AND target_entity='Old';
  PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'multi',p_target=>'New',p_metadata=>jsonb_build_object('supersedes_link_id',old_id),p_observed_at=>'2026-01-02Z');
  PERFORM pg_temp.check_contract((SELECT status='deprecated' FROM public.vanguard_entity_links WHERE id=old_id),'explicit non-singleton supersession');
  PERFORM pg_temp.check_contract((SELECT status='deprecated' AND superseded_by IS NOT NULL FROM public.claims WHERE id=old_id),'explicit supersession projected with pointer');
  BEGIN
    PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'multi',p_target=>'Stale predecessor',p_metadata=>jsonb_build_object('supersedes_link_id',old_id),p_observed_at=>'2026-01-01Z');
    RAISE EXCEPTION 'Expected stale predecessor rejection';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN
    PERFORM public.upsert_vanguard_entity_link('10000000-0000-0000-0000-000000000002','Test person',p_relation=>'multi',p_target=>'No',p_metadata=>jsonb_build_object('supersedes_link_id',old_id));
    RAISE EXCEPTION 'Expected scope rejection';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'deklaruje',p_target=>'Intention');
  PERFORM pg_temp.check_contract((SELECT temporal_status='declared' FROM public.vanguard_entity_links WHERE user_id=u AND target_entity='Intention'),'declaration remains declaration');
  PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'suggests',p_target=>'Hypothesis',p_memory_type=>'hypothesis');
  PERFORM pg_temp.check_contract((SELECT epistemic_status='hypothesis' FROM public.claims c JOIN public.entities o ON o.id=c.object_id WHERE c.user_id=u AND o.canonical_name='Hypothesis'),'hypothesis remains hypothesis');
END;
$$;
-- Real entity resolver: modern aliases/case/merge identity must dedupe and supersede.
DO $$
DECLARE
  u uuid := '10000000-0000-0000-0000-000000000001'; person uuid; old_target uuid; old_link uuid;
  e1 uuid := '20000000-0000-0000-0000-000000000001'; e2 uuid := '20000000-0000-0000-0000-000000000002';
BEGIN
  person := public.resolve_entity(u,'Canonical person','person');
  old_target := public.resolve_entity(u,'Canonical target','unknown');
  INSERT INTO public.entity_aliases(entity_id,alias) VALUES(person,'Alias'),(old_target,'Target alias');
  PERFORM public.upsert_vanguard_entity_link(u,'Alias',p_relation=>'alias_multi',p_target=>'Target alias',p_source_episode_id=>e1,p_observed_at=>'2026-01-01Z');
  PERFORM public.upsert_vanguard_entity_link(u,'CANONICAL PERSON',p_relation=>'alias_multi',p_target=>'CANONICAL TARGET',p_source_episode_id=>e2,p_observed_at=>'2026-01-02Z');
  PERFORM public.upsert_vanguard_entity_link(u,'alias',p_relation=>'alias_multi',p_target=>'Target alias',p_source_episode_id=>e1,p_observed_at=>'2026-01-01Z');
  SELECT id INTO old_link FROM public.vanguard_entity_links WHERE user_id=u AND relation='alias_multi';
  PERFORM pg_temp.check_contract((SELECT evidence_count=2 FROM public.vanguard_entity_links WHERE id=old_link),'alias replay does not grow evidence count');
  PERFORM pg_temp.check_contract((SELECT source_observation_ids=ARRAY[e1,e2] FROM public.claims WHERE id=old_link),'alias replay retains unique sources');
  PERFORM pg_temp.check_contract((SELECT count(*)=1 FROM public.vanguard_entity_links WHERE user_id=u AND relation='alias_multi'),'alias labels reuse single graph triple');
  -- A legacy label in existing graph rows must be reused without migration/backfill.
  UPDATE public.vanguard_entity_links SET source_entity='Alias', target_entity='Target alias' WHERE id=old_link;
  PERFORM public.upsert_vanguard_entity_link(u,'Canonical person',p_relation=>'alias_multi',p_target=>'Canonical target',p_source_episode_id=>e1,p_observed_at=>'2026-01-01Z');
  PERFORM pg_temp.check_contract((SELECT count(*)=1 AND max(evidence_count)=2 FROM public.vanguard_entity_links WHERE user_id=u AND relation='alias_multi'),'preexisting alias-label row is not duplicated');
  PERFORM public.upsert_vanguard_entity_link(u,'alias',p_relation=>'alias_multi',p_target=>'Replacement',p_metadata=>jsonb_build_object('supersedes_target','Target alias'),p_observed_at=>'2026-01-03Z');
  PERFORM pg_temp.check_contract((SELECT status='deprecated' FROM public.vanguard_entity_links WHERE id=old_link),'source and target alias fallback supersedes old link');
  PERFORM pg_temp.check_contract((SELECT NOT(metadata ? 'supersedes_target') AND NOT(metadata ? 'supersedes_link_id') FROM public.vanguard_entity_links WHERE user_id=u AND relation='alias_multi' AND target_entity='Replacement'),'routing metadata is not stored');
  PERFORM public.upsert_vanguard_entity_link(u,'Alias',p_relation=>'test_singleton',p_target=>'First',p_observed_at=>'2026-02-01Z');
  PERFORM public.upsert_vanguard_entity_link(u,'Canonical person',p_relation=>'test_singleton',p_target=>'Second',p_observed_at=>'2026-02-02Z');
  PERFORM pg_temp.check_contract((SELECT count(*)=1 FROM public.vanguard_entity_links WHERE user_id=u AND relation='test_singleton' AND source_entity='Canonical person' AND status='active'),'singleton scope follows canonical subject');
END;
$$;
-- Insertion error cannot deprecate the old link or its projected claim.
CREATE FUNCTION pg_temp.reject_test_target() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.target_entity='Fail insert' THEN RAISE EXCEPTION 'Simulated insert error' USING ERRCODE='23514'; END IF; RETURN NEW; END;
$$;
CREATE TRIGGER research_memory_insert_failure BEFORE INSERT ON public.vanguard_entity_links FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_test_target();
DO $$
DECLARE u uuid := '10000000-0000-0000-0000-000000000001'; v_old uuid;
BEGIN
  SELECT id INTO v_old FROM public.vanguard_entity_links WHERE user_id=u AND target_entity='New';
  BEGIN
    PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'multi',p_target=>'Fail insert',p_metadata=>jsonb_build_object('supersedes_link_id',v_old));
    RAISE EXCEPTION 'Expected insertion failure';
  EXCEPTION WHEN check_violation THEN NULL; END;
  PERFORM pg_temp.check_contract((SELECT status='active' FROM public.vanguard_entity_links WHERE id=v_old),'failed insertion preserves old link');
  PERFORM pg_temp.check_contract((SELECT status='active' FROM public.claims WHERE id=v_old),'failed insertion preserves old claim');
  PERFORM public.upsert_vanguard_entity_link(u,'Test person',p_relation=>'multi',p_target=>'Delete only');
  SELECT id INTO v_old FROM public.vanguard_entity_links WHERE user_id=u AND target_entity='Delete only';
  DELETE FROM public.vanguard_entity_links WHERE id=v_old;
  PERFORM pg_temp.check_contract((SELECT status='deprecated' FROM public.claims WHERE id=v_old),'soft delete retains claim');
END;
$$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.vanguard_preferences(id,user_id,key,value) VALUES(
  '30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','core_memory:test', '{"text":"First","expires_at":"2999-01-01T00:00:00Z"}');
UPDATE public.vanguard_preferences SET value='{"text":"Second"}' WHERE id='30000000-0000-0000-0000-000000000001';
UPDATE public.vanguard_preferences SET updated_at=clock_timestamp() WHERE id='30000000-0000-0000-0000-000000000001';
SELECT pg_temp.check_contract((SELECT count(*)=2 FROM public.vanguard_core_memory_revisions),'timestamp-only updates do not create revisions');
DO $$
DECLARE r uuid; expected timestamptz; v_old text;
BEGIN
  SELECT id,new_value INTO r,v_old FROM public.vanguard_core_memory_revisions WHERE operation='insert';
  SELECT updated_at INTO expected FROM public.vanguard_preferences WHERE id='30000000-0000-0000-0000-000000000001';
  BEGIN
    PERFORM public.restore_core_memory_revision(r,expected-interval '1 second');
    RAISE EXCEPTION 'Expected stale revision rejection';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  PERFORM public.restore_core_memory_revision(r,expected);
  PERFORM pg_temp.check_contract((SELECT value=v_old FROM public.vanguard_preferences WHERE id='30000000-0000-0000-0000-000000000001'),'restore preserves exact value and original TTL');
  PERFORM pg_temp.check_contract((SELECT count(*)=3 FROM public.vanguard_core_memory_revisions),'restore itself creates revision');
  BEGIN
    INSERT INTO public.vanguard_core_memory_revisions(user_id,preference_id,key,operation) VALUES('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','core_memory:test','insert');
    RAISE EXCEPTION 'Expected ledger write rejection';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.vanguard_core_memory_revisions SET new_value='tampered';
    RAISE EXCEPTION 'Expected ledger update rejection';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.vanguard_core_memory_revisions;
    RAISE EXCEPTION 'Expected ledger delete rejection';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.vanguard_preferences SET value='{"text":"Expired","expires_at":"2000-01-01T00:00:00Z"}' WHERE id='30000000-0000-0000-0000-000000000001';
  SELECT id INTO r FROM public.vanguard_core_memory_revisions WHERE new_value LIKE '%Expired%';
  SELECT updated_at INTO expected FROM public.vanguard_preferences WHERE id='30000000-0000-0000-0000-000000000001';
  BEGIN
    PERFORM public.restore_core_memory_revision(r,expected);
    RAISE EXCEPTION 'Expected expired revision rejection';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END;
$$;
DO $$
DECLARE r uuid; expected timestamptz; invalid_value text;
BEGIN
  INSERT INTO public.vanguard_preferences(id,user_id,key,value) VALUES(
    '30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','core_memory:human','Legacy declaration');
  SELECT id INTO r FROM public.vanguard_core_memory_revisions WHERE preference_id='30000000-0000-0000-0000-000000000002';
  UPDATE public.vanguard_preferences SET value='{"text":"Updated","expires_at":"2999-01-01T00:00:00Z"}' WHERE id='30000000-0000-0000-0000-000000000002';
  SELECT updated_at INTO expected FROM public.vanguard_preferences WHERE id='30000000-0000-0000-0000-000000000002';
  PERFORM public.restore_core_memory_revision(r,expected);
  PERFORM pg_temp.check_contract((SELECT value='Legacy declaration' FROM public.vanguard_preferences WHERE id='30000000-0000-0000-0000-000000000002'),'genuine legacy plaintext restores verbatim');
  FOREACH invalid_value IN ARRAY ARRAY['{broken','[broken','{"text":"No expiry"}','{"text":"Bad expiry","expires_at":"invalid"}', '{"text":"Infinite","expires_at":"infinity"}', 'null','"scalar"','   '] LOOP
    UPDATE public.vanguard_preferences SET value=invalid_value WHERE id='30000000-0000-0000-0000-000000000002';
    SELECT id INTO r FROM public.vanguard_core_memory_revisions WHERE preference_id='30000000-0000-0000-0000-000000000002' AND new_value=invalid_value;
    SELECT updated_at INTO expected FROM public.vanguard_preferences WHERE id='30000000-0000-0000-0000-000000000002';
    BEGIN PERFORM public.restore_core_memory_revision(r,expected); RAISE EXCEPTION 'Expected invalid envelope restore rejection: %',invalid_value;
    EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  END LOOP;
END;
$$;
DO $$
DECLARE r uuid; expected timestamptz; before_count int;
BEGIN
  SELECT count(*) INTO before_count FROM public.vanguard_core_memory_revisions;
  INSERT INTO public.vanguard_preferences(user_id,key,value)
    VALUES('10000000-0000-0000-0000-000000000001','coreXmemory:not_core','ordinary setting');
  PERFORM pg_temp.check_contract((SELECT count(*)=before_count FROM public.vanguard_core_memory_revisions),'only exact core memory prefix is tracked');
  BEGIN
    UPDATE public.vanguard_preferences SET key='core_memory:renamed' WHERE id='30000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'Expected identity mutation rejection';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  UPDATE public.vanguard_preferences SET is_active=false WHERE id='30000000-0000-0000-0000-000000000001';
  PERFORM pg_temp.check_contract((SELECT count(*)=before_count+1 FROM public.vanguard_core_memory_revisions),'activation change produces revision');
  DELETE FROM public.vanguard_preferences WHERE id='30000000-0000-0000-0000-000000000001';
  SELECT id INTO r FROM public.vanguard_core_memory_revisions WHERE operation='delete';
  BEGIN PERFORM public.restore_core_memory_revision(r,NULL); RAISE EXCEPTION 'Expected deleted snapshot rejection';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  SELECT id INTO r FROM public.vanguard_core_memory_revisions WHERE operation='insert';
  BEGIN PERFORM public.restore_core_memory_revision(r,NULL); RAISE EXCEPTION 'Expected missing preference rejection';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END;
$$;
RESET ROLE;
-- Simulate a core row created before revision tracking was installed.
ALTER TABLE public.vanguard_preferences DISABLE TRIGGER record_core_memory_revision;
INSERT INTO public.vanguard_preferences(id,user_id,key,value,is_active) VALUES(
  '30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001',
  'core_memory:avoidance','{"text":"Original A","expires_at":"2999-01-01T00:00:00Z"}',false);
ALTER TABLE public.vanguard_preferences ENABLE TRIGGER record_core_memory_revision;
UPDATE public.vanguard_preferences SET value='{"text":"Current B","expires_at":"2999-01-01T00:00:00Z"}',is_active=true
  WHERE id='30000000-0000-0000-0000-000000000003';

SET LOCAL ROLE authenticated;
DO $$
DECLARE r uuid; expected timestamptz;
BEGIN
  SELECT id INTO r FROM public.vanguard_core_memory_revisions WHERE preference_id='30000000-0000-0000-0000-000000000003' AND operation='update';
  SELECT updated_at INTO expected FROM public.vanguard_preferences WHERE id='30000000-0000-0000-0000-000000000003';
  BEGIN PERFORM public.restore_core_memory_revision(r,expected,'unsupported'); RAISE EXCEPTION 'Expected invalid side rejection';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.restore_core_memory_revision(r,expected,NULL); RAISE EXCEPTION 'Expected null side rejection';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM public.restore_core_memory_revision(r,expected,'old');
  PERFORM pg_temp.check_contract((SELECT value='{"text":"Original A","expires_at":"2999-01-01T00:00:00Z"}' AND NOT is_active
    FROM public.vanguard_preferences WHERE id='30000000-0000-0000-0000-000000000003'),'old side restores preexisting value A and active flag');
  SELECT updated_at INTO expected FROM public.vanguard_preferences WHERE id='30000000-0000-0000-0000-000000000003';
  PERFORM public.restore_core_memory_revision(r,expected,'new');
  PERFORM pg_temp.check_contract((SELECT value='{"text":"Current B","expires_at":"2999-01-01T00:00:00Z"}' AND is_active
    FROM public.vanguard_preferences WHERE id='30000000-0000-0000-0000-000000000003'),'new side restores value B and active flag');
  -- Expiry validation applies independently to the chosen side.
  UPDATE public.vanguard_preferences SET value='{"text":"Expired old","expires_at":"2000-01-01T00:00:00Z"}' WHERE id='30000000-0000-0000-0000-000000000003';
  UPDATE public.vanguard_preferences SET value='{"text":"New valid","expires_at":"2999-01-01T00:00:00Z"}' WHERE id='30000000-0000-0000-0000-000000000003';
  SELECT id INTO r FROM public.vanguard_core_memory_revisions WHERE preference_id='30000000-0000-0000-0000-000000000003' AND new_value LIKE '%New valid%';
  SELECT updated_at INTO expected FROM public.vanguard_preferences WHERE id='30000000-0000-0000-0000-000000000003';
  BEGIN PERFORM public.restore_core_memory_revision(r,expected,'old'); RAISE EXCEPTION 'Expected expired old side rejection';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END;
$$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
SELECT pg_temp.check_contract((SELECT count(*)=0 FROM public.vanguard_core_memory_revisions),'other owner cannot read revisions');
RESET ROLE;
DO $$
DECLARE r uuid;
BEGIN
  SELECT id INTO r FROM public.vanguard_core_memory_revisions LIMIT 1;
  BEGIN
    PERFORM public.restore_core_memory_revision(r,NULL);
    RAISE EXCEPTION 'Expected other owner restore rejection';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END;
$$;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM 1 FROM public.vanguard_core_memory_revisions; RAISE EXCEPTION 'Expected anon rejection';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.restore_core_memory_revision(gen_random_uuid(),NULL); RAISE EXCEPTION 'Expected anon RPC rejection';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ BEGIN
  BEGIN INSERT INTO public.vanguard_core_memory_revisions(user_id,preference_id,key,operation)
    VALUES('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','core_memory:test','insert');
    RAISE EXCEPTION 'Expected service role ledger write rejection';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
