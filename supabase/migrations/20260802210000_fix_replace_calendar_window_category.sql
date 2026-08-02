-- Fix replace_calendar_window to strictly scope stale deletions to p_category ('google_sync')
-- so user-created local events and vanguard events are NEVER deleted during sync.

CREATE OR REPLACE FUNCTION public.replace_calendar_window(
  p_user_id uuid, 
  p_category text, 
  p_start timestamp with time zone, 
  p_end timestamp with time zone, 
  p_events jsonb
) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = ''
    AS $$
DECLARE
  v_incoming_ids   text[];
  v_incoming_bases text[];
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || p_category, 0));

  -- Collect all incoming event_ids and their base IDs
  SELECT
    array_agg(e->>'event_id'),
    array_agg(split_part(e->>'event_id', '_', 1))
  INTO v_incoming_ids, v_incoming_bases
  FROM jsonb_array_elements(p_events) AS e;

  -- 1. Delete events in the window that belong to the sync category ONLY (google_sync)
  DELETE FROM public.vanguard_calendar
  WHERE user_id = p_user_id
    AND category = p_category
    AND start_time >= p_start
    AND start_time <= p_end;

  -- 2. Delete stale rows in the sync category ONLY (google_sync).
  --    CRITICAL: Never delete local user events (category != p_category).
  DELETE FROM public.vanguard_calendar
  WHERE user_id = p_user_id
    AND category = p_category
    AND start_time >= p_start
    AND start_time <= p_end
    AND event_id IS NOT NULL
    AND event_id NOT LIKE 'oura_sleep_%'
    AND event_id NOT LIKE 'workout_session_%'
    AND event_id NOT LIKE 'strava_activity_%'
    AND event_id <> ALL(COALESCE(v_incoming_ids,  ARRAY[]::text[]))
    AND event_id <> ALL(COALESCE(v_incoming_bases, ARRAY[]::text[]));

  -- 3. Upsert incoming events, preserving any custom user categories.
  INSERT INTO public.vanguard_calendar (user_id, event_id, summary, start_time, end_time, category)
  SELECT
    p_user_id,
    e->>'event_id',
    e->>'summary',
    (e->>'start_time')::timestamp with time zone,
    (e->>'end_time')::timestamp with time zone,
    COALESCE(
      (SELECT vc.category
       FROM public.vanguard_calendar vc
       WHERE vc.user_id = p_user_id
         AND vc.event_id = e->>'event_id'
         AND vc.category <> 'google_sync'
       LIMIT 1),
      (SELECT vc.category
       FROM public.vanguard_calendar vc
       WHERE vc.user_id = p_user_id
         AND vc.event_id = split_part(e->>'event_id', '_', 1)
         AND vc.category <> 'google_sync'
       LIMIT 1),
      p_category
    )
  FROM jsonb_array_elements(p_events) AS e
  ON CONFLICT (event_id) DO UPDATE SET
    summary    = excluded.summary,
    start_time = excluded.start_time,
    end_time   = excluded.end_time,
    category   = excluded.category;
END;
$$;
