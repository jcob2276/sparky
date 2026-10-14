CREATE OR REPLACE FUNCTION public.save_planned_workout_atomic(p_user_id uuid,p_plan_workout_id uuid,p_day_key varchar,
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
  IF COALESCE(jsonb_typeof(p_logs),'null')<>'array' OR jsonb_array_length(p_logs)=0 THEN RAISE EXCEPTION 'Wpisz wykonany wynik przed zapisem'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_logs) l WHERE COALESCE((l->>'reps')::integer,0)<=0) THEN
    RAISE EXCEPTION 'Wpisz wykonany wynik każdej zapisywanej serii'; END IF;
  v_session := public.save_workout_atomic(p_user_id,p_day_key,p_start_time,p_end_time,p_notes,p_msp_passed,p_logs,p_session_rpe);
  UPDATE public.training_plan_workouts SET completed=true,workout_session_id=v_session,started_at=COALESCE(started_at,now()) WHERE id=p_plan_workout_id;
  RETURN v_session;
END;
$$;
