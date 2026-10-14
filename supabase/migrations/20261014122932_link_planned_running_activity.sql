CREATE FUNCTION public.link_planned_running_activity(p_plan_workout_id uuid,p_strava_id bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_owner uuid:=auth.uid(); v_plan public.training_plan_workouts; v_date date;
BEGIN
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_owner::text || ':training_plan',0));
  SELECT * INTO v_plan FROM public.training_plan_workouts WHERE id=p_plan_workout_id AND user_id=v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan workout not found' USING ERRCODE='42501'; END IF;
  SELECT (start_date AT TIME ZONE 'Europe/Warsaw')::date INTO v_date FROM public.strava_activities_clean
    WHERE user_id=v_owner AND strava_id=p_strava_id AND sport_type ILIKE '%run%' AND distance>0 AND is_oura=false AND start_date<=now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Running activity not found' USING ERRCODE='42501'; END IF;
  IF v_plan.completed AND v_plan.strava_activity_id=p_strava_id THEN RETURN; END IF;
  IF v_plan.completed OR v_plan.workout_session_id IS NOT NULL OR v_plan.skipped_at IS NOT NULL THEN RAISE EXCEPTION 'Sesja jest już zamknięta'; END IF;
  IF v_plan.workout_type NOT ILIKE '%run%' AND COALESCE(v_plan.target_distance_km,0)<=0 THEN RAISE EXCEPTION 'To nie jest sesja biegowa'; END IF;
  IF v_date NOT BETWEEN v_plan.planned_date-1 AND v_plan.planned_date+1 THEN RAISE EXCEPTION 'Data biegu nie pasuje do sesji (różnica ponad dzień)'; END IF;
  IF EXISTS(SELECT 1 FROM public.training_plan_workouts WHERE user_id=v_owner AND strava_activity_id=p_strava_id AND id<>p_plan_workout_id) THEN
    RAISE EXCEPTION 'Ten bieg jest już powiązany z inną sesją'; END IF;
  UPDATE public.training_plan_workouts SET strava_activity_id=p_strava_id,completed=true WHERE id=p_plan_workout_id;
END;
$$;
REVOKE ALL ON FUNCTION public.link_planned_running_activity(uuid,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.link_planned_running_activity(uuid,bigint) TO authenticated;
