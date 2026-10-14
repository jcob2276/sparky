ALTER TABLE public.goal_kpis ADD COLUMN measurement_spec jsonb;
ALTER TABLE public.goal_kpis ADD COLUMN revision integer NOT NULL DEFAULT 1;
ALTER TABLE public.goal_kpis ADD COLUMN measurement_history jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.goal_kpis ADD CONSTRAINT goal_measurement_spec_object
  CHECK(measurement_spec IS NULL OR jsonb_typeof(measurement_spec)='object');

CREATE OR REPLACE FUNCTION public._archive_health_goal_spec()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF (OLD.measurement_spec IS NOT NULL OR NEW.measurement_spec IS NOT NULL)
    AND ROW(OLD.name,OLD.target,OLD.unit,OLD.measurement_spec) IS DISTINCT FROM
      ROW(NEW.name,NEW.target,NEW.unit,NEW.measurement_spec) THEN
    NEW.measurement_history := OLD.measurement_history || jsonb_build_array(jsonb_build_object(
      'revision',OLD.revision,'name',OLD.name,'target',OLD.target,'unit',OLD.unit,
      'spec',OLD.measurement_spec,'replaced_at',now()));
    NEW.revision := OLD.revision+1;
  ELSE NEW.revision := OLD.revision; NEW.measurement_history := OLD.measurement_history;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._archive_health_goal_spec() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER archive_health_goal_spec BEFORE UPDATE ON public.goal_kpis
FOR EACH ROW EXECUTE FUNCTION public._archive_health_goal_spec();

CREATE OR REPLACE FUNCTION public.save_health_goals(p_goals jsonb,p_constraints jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_owner uuid := auth.uid(); v_goal jsonb; v_id uuid; v_kind text;
  v_previous text; v_revision integer; v_saved_revision integer;
BEGIN
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_owner::text || ':health_goals',0));
  IF COALESCE(jsonb_typeof(p_goals),'null')<>'array' OR jsonb_array_length(p_goals)>20
    OR COALESCE(jsonb_typeof(p_constraints),'null')<>'object' OR COALESCE(jsonb_typeof(p_constraints->'availability'),'null')<>'array'
    OR jsonb_array_length(p_constraints->'availability') NOT BETWEEN 1 AND 7
    OR COALESCE(jsonb_typeof(p_constraints->'equipment'),'null')<>'array' OR COALESCE(jsonb_typeof(p_constraints->'limitations'),'null')<>'array'
    THEN RAISE EXCEPTION 'Invalid health goals or constraints'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_constraints->'availability') s
    WHERE COALESCE((s->>'day')::integer,0) NOT BETWEEN 1 AND 7 OR COALESCE((s->>'minutes')::numeric,0) NOT BETWEEN 10 AND 240)
    OR (SELECT count(*) FROM jsonb_array_elements(p_constraints->'availability')) <>
      (SELECT count(DISTINCT s->>'day') FROM jsonb_array_elements(p_constraints->'availability') s)
    THEN RAISE EXCEPTION 'Invalid training availability'; END IF;
  SELECT value INTO v_previous FROM public.vanguard_preferences
    WHERE user_id=v_owner AND key='health_coach:constraints' FOR UPDATE;
  v_revision := COALESCE((v_previous::jsonb->>'revision')::integer,0);
  IF COALESCE((p_constraints->>'revision')::integer,-1)<>v_revision THEN
    RAISE EXCEPTION 'Health constraints changed; refresh before saving' USING ERRCODE='40001'; END IF;
  FOR v_goal IN SELECT value FROM jsonb_array_elements(p_goals) LOOP
    v_kind := v_goal->'spec'->>'kind';
    IF v_kind IS NULL OR v_kind NOT IN('run_10k','body_fat','pull_up','muscle_up','bench','posture')
      OR COALESCE(length(trim(v_goal->>'name')),0) NOT BETWEEN 1 AND 160
      OR COALESCE((v_goal->>'target')::numeric,0) <= 0
      OR COALESCE(v_goal->>'unit','')<>(CASE v_kind WHEN 'run_10k' THEN 'seconds' WHEN 'body_fat' THEN 'percent'
        WHEN 'bench' THEN 'kg' WHEN 'posture' THEN 'confirmed' ELSE 'reps' END)
      THEN RAISE EXCEPTION 'Invalid measurable goal'; END IF;
    IF v_kind='body_fat' AND (v_goal->>'target')::numeric NOT BETWEEN 3 AND 60 THEN RAISE EXCEPTION 'Invalid BF target'; END IF;
    IF v_goal->>'id' IS NOT NULL THEN
      v_id := (v_goal->>'id')::uuid;
      SELECT revision INTO v_saved_revision FROM public.goal_kpis WHERE id=v_id AND user_id=v_owner FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Goal not found' USING ERRCODE='42501'; END IF;
      IF v_saved_revision<>COALESCE((v_goal->>'revision')::integer,-1) THEN RAISE EXCEPTION 'Goal changed; refresh' USING ERRCODE='40001'; END IF;
      UPDATE public.goal_kpis SET name=v_goal->>'name',unit=v_goal->>'unit',target=(v_goal->>'target')::numeric,
        higher_is_better=(v_kind NOT IN('run_10k','body_fat')),measurement_spec=v_goal->'spec'
        WHERE id=v_id AND user_id=v_owner;
    ELSE
      INSERT INTO public.goal_kpis(user_id,pillar,name,unit,target,higher_is_better,measurement_spec)
      VALUES(v_owner,'cialo',v_goal->>'name',v_goal->>'unit',(v_goal->>'target')::numeric,
        v_kind NOT IN('run_10k','body_fat'),v_goal->'spec');
    END IF;
    IF v_kind='body_fat' THEN
      INSERT INTO public.nutrition_profile(user_id,goal_body_fat,updated_at)
        VALUES(v_owner,(v_goal->>'target')::numeric,now())
        ON CONFLICT(user_id) DO UPDATE SET goal_body_fat=excluded.goal_body_fat,updated_at=now();
    END IF;
  END LOOP;
  INSERT INTO public.vanguard_preferences(user_id,key,value,is_active,updated_at)
    VALUES(v_owner,'health_coach:constraints',(p_constraints || jsonb_build_object('revision',v_revision+1,'confirmedAt',now()))::text,true,now())
    ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value,is_active=true,updated_at=now();
END;
$$;
REVOKE ALL ON FUNCTION public.save_health_goals(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_health_goals(jsonb,jsonb) TO authenticated;
