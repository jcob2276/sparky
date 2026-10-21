-- Edycja wpisu zachowuje i pozwala poprawić tłuszcze nasycone.
CREATE OR REPLACE FUNCTION public.update_food_entry(p_user_id uuid, p_entry_id uuid, p_entry jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_date date;
BEGIN
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT date INTO v_date FROM public.daily_food_entries WHERE id = p_entry_id AND user_id = p_user_id;
  IF v_date IS NULL THEN
    RAISE EXCEPTION 'entry not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || v_date::text, 0));

  UPDATE public.daily_food_entries SET
    name = COALESCE(p_entry->>'name', name),
    brand = COALESCE(p_entry->>'brand', brand),
    calories = COALESCE((p_entry->>'calories')::integer, calories),
    protein = COALESCE((p_entry->>'protein')::numeric, protein),
    carbs = COALESCE((p_entry->>'carbs')::numeric, carbs),
    fat = COALESCE((p_entry->>'fat')::numeric, fat),
    fiber = COALESCE((p_entry->>'fiber')::numeric, fiber),
    sugar = COALESCE((p_entry->>'sugar')::numeric, sugar),
    saturated_fat = COALESCE((p_entry->>'saturated_fat')::numeric, saturated_fat),
    meal_type = COALESCE(p_entry->>'meal_type', meal_type),
    amount = COALESCE(p_entry->>'amount', amount)
  WHERE id = p_entry_id AND user_id = p_user_id;

  PERFORM public._recompute_daily_nutrition(p_user_id, v_date);
END;
$function$;
