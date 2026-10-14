CREATE TABLE public.training_plan_versions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK(revision>0), base_revision integer NOT NULL CHECK(base_revision>=0),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','active','superseded')),
  snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'), context_fingerprint text NOT NULL,
  approval_key text, previous_version_id uuid REFERENCES public.training_plan_versions(id),
  created_at timestamptz NOT NULL DEFAULT now(), activated_at timestamptz,
  UNIQUE(user_id,revision), UNIQUE(user_id,approval_key)
);
CREATE UNIQUE INDEX one_active_training_plan ON public.training_plan_versions(user_id) WHERE status='active';
ALTER TABLE public.training_plan_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY training_plan_owner_read ON public.training_plan_versions FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
GRANT SELECT ON public.training_plan_versions TO authenticated;
GRANT ALL ON public.training_plan_versions TO service_role;

ALTER TABLE public.training_plan_workouts ADD COLUMN plan_version_id uuid REFERENCES public.training_plan_versions(id);
ALTER TABLE public.training_plan_workouts ADD COLUMN prescription jsonb;
ALTER TABLE public.training_plan_workouts ADD COLUMN workout_session_id uuid REFERENCES public.workout_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.training_plan_workouts ADD COLUMN started_at timestamptz;
ALTER TABLE public.training_plan_workouts ADD COLUMN skipped_at timestamptz;
ALTER TABLE public.training_plan_workouts ADD COLUMN session_key text;
CREATE INDEX plan_workouts_active_date ON public.training_plan_workouts(user_id,planned_date);
CREATE UNIQUE INDEX plan_session_identity ON public.training_plan_workouts(plan_version_id,session_key) WHERE session_key IS NOT NULL;

CREATE TABLE public.health_coach_jobs(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_key text NOT NULL CHECK(length(request_key) BETWEEN 1 AND 120), payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'queued' CHECK(status IN('queued','running','completed','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3), lease_token uuid, leased_until timestamptz,
  result_version_id uuid REFERENCES public.training_plan_versions(id), last_error text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,request_key)
);
ALTER TABLE public.health_coach_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY health_coach_job_owner_read ON public.health_coach_jobs FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE INDEX health_coach_jobs_pending ON public.health_coach_jobs(status,leased_until) WHERE status IN('queued','running');
GRANT SELECT ON public.health_coach_jobs TO authenticated;
GRANT ALL ON public.health_coach_jobs TO service_role;

CREATE FUNCTION public.health_coach_fingerprint(p_owner uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT md5(COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'target',target,'unit',unit,
    'spec',measurement_spec,'revision',revision) ORDER BY id)::text FROM public.goal_kpis WHERE user_id=p_owner),'[]')
    || COALESCE((SELECT value FROM public.vanguard_preferences WHERE user_id=p_owner AND key='health_coach:constraints' AND is_active),'{}'));
$$;
REVOKE ALL ON FUNCTION public.health_coach_fingerprint(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.health_coach_fingerprint(uuid) TO service_role;

CREATE FUNCTION public.enqueue_health_coach_job(p_owner uuid,p_request_key text,p_payload jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.health_coach_jobs(user_id,request_key,payload) VALUES(p_owner,p_request_key,
    p_payload || jsonb_build_object('_baseRevision',COALESCE((SELECT revision FROM public.training_plan_versions WHERE user_id=p_owner AND status='active'),0)))
  ON CONFLICT(user_id,request_key) DO UPDATE SET request_key=excluded.request_key RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_health_coach_job(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_health_coach_job(uuid,text,jsonb) TO service_role;

CREATE FUNCTION public.claim_health_coach_job(p_job uuid) RETURNS SETOF public.health_coach_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  UPDATE public.health_coach_jobs SET status='failed',last_error='Worker lease expired after final attempt',updated_at=now()
    WHERE id=p_job AND status='running' AND leased_until<now() AND attempts>=3;
  RETURN QUERY UPDATE public.health_coach_jobs SET status='running',attempts=attempts+1,
    lease_token=gen_random_uuid(),leased_until=now()+interval '4 minutes',updated_at=now()
    WHERE id=p_job AND attempts<3 AND (status='queued' OR (status='running' AND leased_until<now())) RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_health_coach_job(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_health_coach_job(uuid) TO service_role;

CREATE FUNCTION public.create_health_plan_draft(p_owner uuid,p_snapshot jsonb,p_fingerprint text,p_base_revision integer DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_revision integer; v_base integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text || ':training_plan',0));
  SELECT COALESCE(max(revision),0)+1 INTO v_revision FROM public.training_plan_versions WHERE user_id=p_owner;
  SELECT revision INTO v_base FROM public.training_plan_versions WHERE user_id=p_owner AND status='active';
  IF p_base_revision IS NOT NULL AND p_base_revision<>COALESCE(v_base,0) THEN RAISE EXCEPTION 'Training plan revision conflict' USING ERRCODE='40001'; END IF;
  INSERT INTO public.training_plan_versions(user_id,revision,base_revision,snapshot,context_fingerprint)
    VALUES(p_owner,v_revision,COALESCE(v_base,0),p_snapshot,p_fingerprint) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_health_plan_draft(uuid,jsonb,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_health_plan_draft(uuid,jsonb,text,integer) TO service_role;

CREATE FUNCTION public.complete_health_plan_job(p_job uuid,p_token uuid,p_snapshot jsonb,p_fingerprint text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_job public.health_coach_jobs; v_id uuid;
BEGIN
  SELECT * INTO v_job FROM public.health_coach_jobs WHERE id=p_job FOR UPDATE;
  IF NOT FOUND OR v_job.status<>'running' OR v_job.lease_token<>p_token OR v_job.leased_until<=now() THEN
    RAISE EXCEPTION 'Job lease lost'; END IF;
  v_id := public.create_health_plan_draft(v_job.user_id,p_snapshot,p_fingerprint,(v_job.payload->>'_baseRevision')::integer);
  UPDATE public.health_coach_jobs SET status='completed',result_version_id=v_id,leased_until=NULL,updated_at=now(),last_error=NULL WHERE id=p_job;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_health_plan_job(uuid,uuid,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_health_plan_job(uuid,uuid,jsonb,text) TO service_role;

CREATE FUNCTION public.fail_health_coach_job(p_job uuid,p_token uuid,p_error text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  UPDATE public.health_coach_jobs SET status=CASE WHEN attempts>=3 THEN 'failed' ELSE 'queued' END,
    leased_until=NULL,last_error=left(p_error,500),updated_at=now()
    WHERE id=p_job AND lease_token=p_token AND status='running';
$$;
REVOKE ALL ON FUNCTION public.fail_health_coach_job(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fail_health_coach_job(uuid,uuid,text) TO service_role;

CREATE FUNCTION public.activate_training_plan(p_owner uuid,p_version uuid,p_base_revision integer,p_request_key text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_plan public.training_plan_versions; v_current public.training_plan_versions; v_session jsonb;
  v_today date := (now() AT TIME ZONE 'Europe/Warsaw')::date;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text || ':health_goals',0));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text || ':training_plan',0));
  SELECT * INTO v_plan FROM public.training_plan_versions WHERE id=p_version AND user_id=p_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Training plan not found' USING ERRCODE='42501'; END IF;
  IF v_plan.status='active' THEN RETURN v_plan.id; END IF;
  IF v_plan.status<>'draft' THEN RAISE EXCEPTION 'Only a draft can be activated'; END IF;
  SELECT * INTO v_current FROM public.training_plan_versions WHERE user_id=p_owner AND status='active' FOR UPDATE;
  IF COALESCE(v_current.revision,0)<>p_base_revision OR v_plan.base_revision<>p_base_revision THEN
    RAISE EXCEPTION 'Training plan revision conflict; refresh' USING ERRCODE='40001'; END IF;
  IF v_plan.context_fingerprint<>public.health_coach_fingerprint(p_owner) THEN
    RAISE EXCEPTION 'Goals or constraints changed; regenerate preview' USING ERRCODE='40001'; END IF;
  IF COALESCE(jsonb_typeof(v_plan.snapshot->'sessions'),'null')<>'array'
    OR jsonb_array_length(v_plan.snapshot->'sessions') NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid plan sessions'; END IF;
  -- An immutable snapshot retains the old prescription; executions and started drafts stay in place.
  DELETE FROM public.training_plan_workouts WHERE user_id=p_owner AND planned_date>=v_today
    AND NOT COALESCE(completed,false) AND workout_session_id IS NULL AND started_at IS NULL;
  UPDATE public.training_plan_versions SET status='superseded' WHERE id=v_current.id;
  UPDATE public.training_plan_versions SET status='active',activated_at=now(),approval_key=p_request_key,previous_version_id=v_current.id WHERE id=p_version;
  FOR v_session IN SELECT value FROM jsonb_array_elements(v_plan.snapshot->'sessions') LOOP
    IF (v_session->>'date')::date<v_today THEN CONTINUE; END IF;
    IF EXISTS(SELECT 1 FROM public.training_plan_workouts WHERE user_id=p_owner AND planned_date=(v_session->>'date')::date
      AND (started_at IS NOT NULL OR COALESCE(completed,false))) THEN CONTINUE; END IF;
    INSERT INTO public.training_plan_workouts(user_id,plan_version_id,session_key,planned_date,day_of_week,
      workout_type,workout_name,goal,description,target_duration_min,target_distance_km,prescription)
    VALUES(p_owner,p_version,v_session->>'key',(v_session->>'date')::date,
      extract(isodow FROM (v_session->>'date')::date)::text,v_session->>'type',v_session->>'name',
      v_session->>'goal',v_session->>'notes',(v_session->>'durationMinutes')::integer,
      NULLIF(v_session->>'distanceKm','')::double precision,v_session);
  END LOOP;
  RETURN p_version;
END;
$$;
REVOKE ALL ON FUNCTION public.activate_training_plan(uuid,uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.activate_training_plan(uuid,uuid,integer,text) TO service_role;

CREATE FUNCTION public.start_planned_workout(p_plan_workout_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_owner uuid:=auth.uid(); v_workout public.training_plan_workouts;
BEGIN
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_owner::text || ':training_plan',0));
  SELECT * INTO v_workout FROM public.training_plan_workouts WHERE id=p_plan_workout_id AND user_id=v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workout not found' USING ERRCODE='42501'; END IF;
  IF v_workout.completed OR v_workout.skipped_at IS NOT NULL THEN RAISE EXCEPTION 'Workout already closed'; END IF;
  IF v_workout.started_at IS NULL AND NOT EXISTS(SELECT 1 FROM public.training_plan_versions WHERE id=v_workout.plan_version_id AND status='active') THEN
    RAISE EXCEPTION 'Plan changed; refresh'; END IF;
  UPDATE public.training_plan_workouts SET started_at=COALESCE(started_at,now()) WHERE id=p_plan_workout_id;
  RETURN jsonb_build_object('id',v_workout.id,'prescription',v_workout.prescription,'name',v_workout.workout_name);
END;
$$;
REVOKE ALL ON FUNCTION public.start_planned_workout(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_planned_workout(uuid) TO authenticated;

CREATE FUNCTION public.save_planned_workout_atomic(p_user_id uuid,p_plan_workout_id uuid,p_day_key varchar,
  p_start_time timestamptz,p_end_time timestamptz,p_notes text,p_msp_passed boolean,p_logs jsonb,p_session_rpe integer DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_workout public.training_plan_workouts; v_session uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid()<>p_user_id THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':training_plan',0));
  SELECT * INTO v_workout FROM public.training_plan_workouts WHERE id=p_plan_workout_id AND user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workout not found' USING ERRCODE='42501'; END IF;
  IF v_workout.workout_session_id IS NOT NULL THEN RETURN v_workout.workout_session_id; END IF;
  IF v_workout.skipped_at IS NOT NULL OR v_workout.completed THEN RAISE EXCEPTION 'Workout already closed'; END IF;
  v_session := public.save_workout_atomic(p_user_id,p_day_key,p_start_time,p_end_time,p_notes,p_msp_passed,p_logs,p_session_rpe);
  UPDATE public.training_plan_workouts SET completed=true,workout_session_id=v_session,started_at=COALESCE(started_at,now()) WHERE id=p_plan_workout_id;
  RETURN v_session;
END;
$$;
REVOKE ALL ON FUNCTION public.save_planned_workout_atomic(uuid,uuid,varchar,timestamptz,timestamptz,text,boolean,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_planned_workout_atomic(uuid,uuid,varchar,timestamptz,timestamptz,text,boolean,jsonb,integer) TO authenticated;

-- Preserve legacy session IDs and completed runs while establishing their first version.
DO $$
DECLARE v_owner uuid; v_id uuid;
BEGIN
  FOR v_owner IN SELECT DISTINCT user_id FROM public.training_plan_workouts LOOP
    INSERT INTO public.training_plan_versions(user_id,revision,base_revision,status,snapshot,context_fingerprint,activated_at)
    SELECT v_owner,1,0,'active',jsonb_build_object('title','Dotychczasowy plan','blockWeeks',4,
      'startDate',min(planned_date),'sessions',jsonb_agg(jsonb_build_object('key',id,'date',planned_date,'type',workout_type,
        'name',workout_name,'goal',goal,'durationMinutes',target_duration_min,'notes',description,'exercises','[]'::jsonb))),
      public.health_coach_fingerprint(v_owner),now() FROM public.training_plan_workouts WHERE user_id=v_owner RETURNING id INTO v_id;
    UPDATE public.training_plan_workouts SET plan_version_id=v_id WHERE user_id=v_owner;
  END LOOP;
END;
$$;

-- pg_net delivery is independent of the caller's HTTP lifetime. A technical cron retries lost deliveries.
CREATE FUNCTION public.dispatch_health_coach_jobs(p_job uuid DEFAULT NULL) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_key text; v_job record; v_count integer:=0;
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name='vanguard_cron_service_role_key' LIMIT 1;
  IF v_key IS NULL THEN RETURN 0; END IF;
  FOR v_job IN SELECT id FROM public.health_coach_jobs WHERE (p_job IS NULL OR id=p_job)
    AND (status='queued' OR (status='running' AND leased_until<now())) ORDER BY created_at LIMIT 5 LOOP
    PERFORM net.http_post(url:='https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/analyze-training-load',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_key),
      body:=jsonb_build_object('action','run_job','jobId',v_job.id),timeout_milliseconds:=180000);
    v_count:=v_count+1;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_health_coach_jobs(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_health_coach_jobs(uuid) TO service_role;
CREATE FUNCTION public._dispatch_new_health_coach_job() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN PERFORM public.dispatch_health_coach_jobs(NEW.id); RETURN NULL; END;
$$;
REVOKE ALL ON FUNCTION public._dispatch_new_health_coach_job() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER dispatch_new_health_coach_job AFTER INSERT ON public.health_coach_jobs FOR EACH ROW EXECUTE FUNCTION public._dispatch_new_health_coach_job();
