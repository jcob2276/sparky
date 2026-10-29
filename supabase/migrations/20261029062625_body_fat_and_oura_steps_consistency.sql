-- Match the existing male Navy UI contract: belly, then waist.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE OR REPLACE FUNCTION public.compute_navy_bf()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_height numeric;
  v_sex text;
  v_waist numeric;
  v_diff numeric;
  v_bf numeric;
BEGIN
  IF NEW.neck IS NULL THEN RETURN NEW; END IF;
  SELECT height_cm, upper(coalesce(sex, 'M')) INTO v_height, v_sex
  FROM public.nutrition_profile WHERE user_id = NEW.user_id;
  IF v_height IS NULL OR v_height <= 0 THEN RETURN NEW; END IF;
  v_waist := CASE WHEN v_sex = 'F' THEN NEW.waist ELSE coalesce(NEW.belly, NEW.waist) END;
  IF v_waist IS NULL THEN RETURN NEW; END IF;
  IF v_sex = 'F' AND NEW.hips IS NOT NULL THEN
    v_diff := v_waist + NEW.hips - NEW.neck;
    IF v_diff <= 0 THEN RETURN NEW; END IF;
    v_bf := 495 / (1.29579 - 0.35004 * log(v_diff) + 0.22100 * log(v_height)) - 450;
  ELSE
    v_diff := v_waist - NEW.neck;
    IF v_diff <= 0 THEN RETURN NEW; END IF;
    v_bf := 495 / (1.0324 - 0.19077 * log(v_diff) + 0.15456 * log(v_height)) - 450;
  END IF;
  NEW.body_fat := greatest(3, least(50, round(v_bf, 1)));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.compute_navy_bf() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_navy_bf ON public.body_metrics;
CREATE TRIGGER trg_navy_bf BEFORE INSERT OR UPDATE OF neck, waist, belly, hips
ON public.body_metrics FOR EACH ROW EXECUTE FUNCTION public.compute_navy_bf();

-- Only repair values matching the old generated estimate; preserve independent BF entries.
WITH estimates AS (
  SELECT m.id,
    CASE WHEN m.waist > m.neck AND p.height_cm > 0 THEN
      greatest(3, least(50, round(495 / (1.0324 - 0.19077 * log(m.waist - m.neck)
        + 0.15456 * log(p.height_cm)) - 450, 1))) END AS old_bf,
    CASE WHEN m.belly > m.neck AND p.height_cm > 0 THEN
      greatest(3, least(50, round(495 / (1.0324 - 0.19077 * log(m.belly - m.neck)
        + 0.15456 * log(p.height_cm)) - 450, 1))) END AS new_bf
  FROM public.body_metrics m JOIN public.nutrition_profile p ON p.user_id = m.user_id
  WHERE upper(coalesce(p.sex, 'M')) = 'M' AND m.belly IS NOT NULL
)
UPDATE public.body_metrics m SET body_fat = e.new_bf FROM estimates e
WHERE m.id = e.id AND m.body_fat = e.old_bf AND e.new_bf IS NOT NULL
  AND m.body_fat IS DISTINCT FROM e.new_bf;

-- Recover legacy measurements only where the canonical value is unknown.
UPDATE public.oura_daily_summary s SET steps = e.steps
FROM public.oura_enhanced e
WHERE s.user_id = e.user_id AND s.date = e.date AND s.steps IS NULL AND e.steps IS NOT NULL;
UPDATE public.oura_enhanced e SET steps = s.steps
FROM public.oura_daily_summary s
WHERE s.user_id = e.user_id AND s.date = e.date AND e.steps IS DISTINCT FROM s.steps;

-- Subsequent canonical changes maintain existing detail rows; sync initializes new rows.
CREATE OR REPLACE FUNCTION public.refresh_oura_steps_projection(p_user_id uuid, p_dates date[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE r record;
BEGIN
  -- Always lock source before projection. Do not fetch then upsert through two HTTP requests.
  FOR r IN SELECT date, steps FROM public.oura_daily_summary
    WHERE user_id = p_user_id AND date = ANY(p_dates) ORDER BY date FOR SHARE
  LOOP
    UPDATE public.oura_enhanced SET steps = r.steps
    WHERE user_id = p_user_id AND date = r.date AND steps IS DISTINCT FROM r.steps;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_oura_steps_projection(uuid, date[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_oura_steps_projection(uuid, date[]) TO service_role;

CREATE OR REPLACE FUNCTION public.project_oura_daily_steps()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.oura_enhanced SET steps = NULL
    WHERE user_id = OLD.user_id AND date = OLD.date AND steps IS NOT NULL;
    RETURN OLD;
  END IF;
  PERFORM public.refresh_oura_steps_projection(NEW.user_id, ARRAY[NEW.date]);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.project_oura_daily_steps() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_project_oura_daily_steps AFTER INSERT OR DELETE OR UPDATE OF steps
ON public.oura_daily_summary FOR EACH ROW EXECUTE FUNCTION public.project_oura_daily_steps();
COMMENT ON COLUMN public.oura_enhanced.steps IS
  'Projection of oura_daily_summary.steps; canonical updates maintain this copy.';
COMMIT;
