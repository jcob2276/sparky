-- Migration: Treat Garmin Kardio / Cardio / Sauna as Sauna in vanguard_calendar
-- 1 day with multiple sessions = 1 grouped Sauna event

CREATE OR REPLACE FUNCTION public.trg_sync_strava_activity_to_calendar()
RETURNS TRIGGER AS $$
DECLARE
  v_summary text;
  v_start timestamptz;
  v_end timestamptz;
  v_is_sauna boolean;
  v_act_date date;
  v_sauna_event_id text;
  v_sauna_start timestamptz;
  v_sauna_end timestamptz;
  v_sauna_count int;
  v_sauna_mins int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.vanguard_calendar
    WHERE event_id = 'strava_activity_' || OLD.strava_id;
    RETURN OLD;
  END IF;

  -- Skip Oura duplicates
  IF COALESCE(NEW.is_oura_duplicate, false) = true THEN
    DELETE FROM public.vanguard_calendar
    WHERE event_id = 'strava_activity_' || NEW.strava_id;
    RETURN NEW;
  END IF;

  -- Check if activity is Kardio / Sauna from Garmin
  v_is_sauna := (
    NEW.name ILIKE '%kardio%' OR
    NEW.name ILIKE '%cardio%' OR
    NEW.name ILIKE '%sauna%'
  );

  IF v_is_sauna THEN
    -- Delete individual single row if one was previously created for this activity
    DELETE FROM public.vanguard_calendar
    WHERE event_id = 'strava_activity_' || NEW.strava_id;

    -- Compute Warsaw date for this activity
    v_act_date := (NEW.start_date AT TIME ZONE 'Europe/Warsaw')::date;
    v_sauna_event_id := 'strava_activity_sauna_' || NEW.user_id || '_' || v_act_date::text;

    -- Aggregate all sauna/kardio sessions on this date into 1 calendar event
    SELECT 
      MIN(start_date),
      MAX(start_date + (COALESCE(elapsed_time, 1800) * interval '1 second')),
      COUNT(*),
      ROUND(SUM(COALESCE(elapsed_time, 0)) / 60.0)
    INTO v_sauna_start, v_sauna_end, v_sauna_count, v_sauna_mins
    FROM public.strava_activities
    WHERE user_id = NEW.user_id
      AND (start_date AT TIME ZONE 'Europe/Warsaw')::date = v_act_date
      AND (name ILIKE '%kardio%' OR name ILIKE '%cardio%' OR name ILIKE '%sauna%')
      AND COALESCE(is_oura_duplicate, false) = false;

    IF v_sauna_count > 1 THEN
      v_summary := 'Sauna 🧖 (' || v_sauna_count || ' serie · ' || v_sauna_mins || ' min)';
    ELSE
      v_summary := 'Sauna 🧖 (' || v_sauna_mins || ' min)';
    END IF;

    INSERT INTO public.vanguard_calendar (user_id, event_id, summary, start_time, end_time, category, description)
    VALUES (
      NEW.user_id,
      v_sauna_event_id,
      v_summary,
      v_sauna_start,
      v_sauna_end,
      'odpoczynek_regeneracja',
      'Zsynchronizowano z Garmina (' || v_sauna_count || ' sesje kardio jako 1 sauna)'
    )
    ON CONFLICT (event_id) DO UPDATE SET
      summary = EXCLUDED.summary,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      category = EXCLUDED.category,
      description = EXCLUDED.description;

    RETURN NEW;
  END IF;

  -- Default: Running / Other workout
  v_summary := 'Bieg 🏃 (' || COALESCE(NEW.name, 'Strava') || ')';
  v_start := NEW.start_date;
  v_end := NEW.start_date + (COALESCE(NEW.elapsed_time, 3600) * interval '1 second');

  INSERT INTO public.vanguard_calendar (user_id, event_id, summary, start_time, end_time, category)
  VALUES (
    NEW.user_id,
    'strava_activity_' || NEW.strava_id,
    v_summary,
    v_start,
    v_end,
    'cialo_trening'
  )
  ON CONFLICT (event_id) DO UPDATE SET
    summary = EXCLUDED.summary,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    category = EXCLUDED.category;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
