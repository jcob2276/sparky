-- Fathom may return inconsistent historical timestamps (years between start and end).
-- Preserve the source timestamps, but an impossible call duration remains unknown.
CREATE OR REPLACE FUNCTION public.closer_recording_normalize_duration()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.duration_seconds < 0 OR NEW.duration_seconds > 86400 THEN
    NEW.duration_seconds := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER closer_calls_normalize_duration
BEFORE INSERT OR UPDATE OF duration_seconds ON public.closer_calls
FOR EACH ROW EXECUTE FUNCTION public.closer_recording_normalize_duration();
REVOKE ALL ON FUNCTION public.closer_recording_normalize_duration() FROM PUBLIC, anon;

UPDATE public.closer_calls SET duration_seconds = NULL
WHERE duration_seconds < 0 OR duration_seconds > 86400;

-- Recorded calls provide a minimum, overlapping manual totals are never added twice.
-- Work hours include recorded time; a larger manual total can include other work.
CREATE OR REPLACE FUNCTION public.closer_apply_fathom_floor()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  recorded_calls integer;
  recorded_hours numeric;
BEGIN
  SELECT count(*)::integer, round(coalesce(sum(greatest(duration_seconds, 0)), 0) / 3600.0, 2)
    INTO recorded_calls, recorded_hours
    FROM public.closer_calls
    WHERE user_id = NEW.user_id AND call_date = NEW.date;
  NEW.sales_calls := greatest(NEW.sales_calls, recorded_calls);
  NEW.work_hours := greatest(NEW.work_hours, recorded_hours);
  RETURN NEW;
END;
$$;

CREATE TRIGGER closer_daily_logs_fathom_floor
BEFORE INSERT OR UPDATE OF sales_calls, work_hours ON public.closer_daily_logs
FOR EACH ROW EXECUTE FUNCTION public.closer_apply_fathom_floor();

CREATE OR REPLACE FUNCTION public.closer_recording_refresh_day()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.closer_daily_logs (user_id, date)
  VALUES (NEW.user_id, NEW.call_date)
  ON CONFLICT (user_id, date) DO UPDATE SET
    sales_calls = greatest(closer_daily_logs.sales_calls, EXCLUDED.sales_calls),
    work_hours = greatest(closer_daily_logs.work_hours, EXCLUDED.work_hours),
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER closer_calls_refresh_daily_totals
AFTER INSERT OR UPDATE OF user_id, call_date, duration_seconds ON public.closer_calls
FOR EACH ROW EXECUTE FUNCTION public.closer_recording_refresh_day();

CREATE OR REPLACE FUNCTION public.closer_daily_refresh_weekly_kpis()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  week_start_date date := date_trunc('week', NEW.date::timestamp)::date;
  appointments_total numeric;
  calls_total numeric;
  conversations_total numeric;
  hours_total numeric;
BEGIN
  -- Serialize the aggregate for different days updated in the same week.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text || ':' || week_start_date::text, 0));
  SELECT coalesce(sum(appointments), 0), coalesce(sum(sales_calls), 0),
         coalesce(sum(dials), 0), round(coalesce(sum(work_hours), 0), 1)
  INTO appointments_total, calls_total, conversations_total, hours_total
  FROM public.closer_daily_logs
  WHERE user_id = NEW.user_id AND date BETWEEN week_start_date AND week_start_date + 6;

  INSERT INTO public.kpi_entries (user_id, kpi_id, week_start, value)
  SELECT NEW.user_id, k.id, week_start_date,
    CASE
      WHEN lower(k.name) LIKE '%umówie%' THEN appointments_total
      WHEN lower(k.name) LIKE '%call%' THEN calls_total
      WHEN lower(k.name) LIKE '%rozmow%' OR lower(k.name) LIKE '%dial%' THEN conversations_total
      WHEN lower(k.name) LIKE '%godzin%' THEN hours_total
    END
  FROM public.goal_kpis k JOIN public.projects p ON p.id = k.project_id
  WHERE k.user_id = NEW.user_id AND p.user_id = NEW.user_id
    AND p.status = 'active' AND p.name ILIKE '%closer%'
    AND (lower(k.name) LIKE '%umówie%' OR lower(k.name) LIKE '%call%'
      OR lower(k.name) LIKE '%rozmow%' OR lower(k.name) LIKE '%dial%'
      OR lower(k.name) LIKE '%godzin%')
  ON CONFLICT (kpi_id, week_start) DO UPDATE SET value = EXCLUDED.value;
  RETURN NEW;
END;
$$;

CREATE TRIGGER closer_daily_logs_refresh_weekly_kpis
AFTER INSERT OR UPDATE OF appointments, sales_calls, dials, work_hours ON public.closer_daily_logs
FOR EACH ROW EXECUTE FUNCTION public.closer_daily_refresh_weekly_kpis();

REVOKE ALL ON FUNCTION public.closer_apply_fathom_floor() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.closer_recording_refresh_day() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.closer_daily_refresh_weekly_kpis() FROM PUBLIC, anon;

-- Backfill the imported history through the same triggers used by future webhooks.
INSERT INTO public.closer_daily_logs (user_id, date)
SELECT DISTINCT user_id, call_date FROM public.closer_calls
ON CONFLICT (user_id, date) DO UPDATE SET
  sales_calls = greatest(closer_daily_logs.sales_calls, EXCLUDED.sales_calls),
  work_hours = greatest(closer_daily_logs.work_hours, EXCLUDED.work_hours),
  updated_at = now();

