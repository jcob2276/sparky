-- Keep the existing aggregate and write paths, including direct entry edits, consistent.
CREATE OR REPLACE FUNCTION public._recompute_daily_nutrition(p_user_id uuid, p_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text || p_date::text, 0));
  INSERT INTO public.daily_nutrition(user_id,date,calories,protein,carbs,fat,fiber,sugar,insulin_load)
  SELECT p_user_id,p_date,COALESCE(SUM(calories),0),SUM(protein),SUM(carbs),SUM(fat),
    SUM(fiber),SUM(sugar),SUM(insulin_load)
  FROM public.daily_food_entries WHERE user_id=p_user_id AND date=p_date
  ON CONFLICT(user_id,date) DO UPDATE SET calories=excluded.calories,
    protein=excluded.protein,carbs=excluded.carbs,fat=excluded.fat,
    fiber=excluded.fiber,sugar=excluded.sugar,insulin_load=excluded.insulin_load;
END;
$$;
REVOKE ALL ON FUNCTION public._recompute_daily_nutrition(uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public._recompute_daily_nutrition(uuid,date) TO service_role;

-- A narrowly scoped trigger may call the private aggregate; it accepts no caller-supplied IDs.
CREATE OR REPLACE FUNCTION public._sync_nutrition_entry_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_old_user uuid; v_new_user uuid; v_old_date date; v_new_date date; v_pair record;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old_user := OLD.user_id; v_old_date := OLD.date; END IF;
  IF TG_OP <> 'DELETE' THEN v_new_user := NEW.user_id; v_new_date := NEW.date; END IF;
  -- Stable ordering prevents two entry moves taking the same day locks in reverse order.
  FOR v_pair IN
    SELECT DISTINCT owner_id,day FROM (VALUES(v_old_user,v_old_date),(v_new_user,v_new_date)) AS p(owner_id,day)
    WHERE owner_id IS NOT NULL AND day IS NOT NULL ORDER BY owner_id,day
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_pair.owner_id::text || v_pair.day::text,0));
  END LOOP;
  FOR v_pair IN
    SELECT DISTINCT owner_id,day FROM (VALUES(v_old_user,v_old_date),(v_new_user,v_new_date)) AS p(owner_id,day)
    WHERE owner_id IS NOT NULL AND day IS NOT NULL ORDER BY owner_id,day
  LOOP
    PERFORM public._recompute_daily_nutrition(v_pair.owner_id,v_pair.day);
  END LOOP;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public._sync_nutrition_entry_totals() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_nutrition_entry_totals
AFTER INSERT OR UPDATE OR DELETE ON public.daily_food_entries
FOR EACH ROW EXECUTE FUNCTION public._sync_nutrition_entry_totals();

-- Repair only derived totals. This does not mark any food day complete or fabricate meals.
DO $$
DECLARE v_day record;
BEGIN
  FOR v_day IN SELECT DISTINCT user_id,date FROM public.daily_food_entries LOOP
    PERFORM public._recompute_daily_nutrition(v_day.user_id,v_day.date);
  END LOOP;
END;
$$;
