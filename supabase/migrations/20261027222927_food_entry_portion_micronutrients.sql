-- Edycja wagi przelicza także składniki niewidoczne w edytorze głównych makr.
-- Gdy stary wpis nie ma masy (np. „1 porcja”), nowa waga opisuje tę samą całą porcję.
CREATE OR REPLACE FUNCTION public.update_food_entry(p_user_id uuid, p_entry_id uuid, p_entry jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_date date;
  v_previous public.daily_food_entries%ROWTYPE;
  v_old_parts text[];
  v_new_parts text[];
  v_old_grams numeric;
  v_new_grams numeric;
  v_factor numeric := 1;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT date INTO v_date FROM public.daily_food_entries WHERE id = p_entry_id AND user_id = p_user_id;
  IF v_date IS NULL THEN RAISE EXCEPTION 'entry not found'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || v_date::text, 0));
  SELECT * INTO v_previous FROM public.daily_food_entries
  WHERE id = p_entry_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'entry not found'; END IF;

  IF p_entry->>'amount' IS NOT NULL THEN
    v_old_parts := regexp_match(v_previous.amount, '^\s*([0-9]+(?:[.,][0-9]+)?)\s*(kg|g|gr|grams?|ml|l)\s*$', 'i');
    v_new_parts := regexp_match(p_entry->>'amount', '^\s*([0-9]+(?:[.,][0-9]+)?)\s*(kg|g|gr|grams?|ml|l)\s*$', 'i');
    v_old_grams := replace(v_old_parts[1], ',', '.')::numeric * CASE lower(v_old_parts[2]) WHEN 'kg' THEN 1000 WHEN 'l' THEN 1000 ELSE 1 END;
    v_new_grams := replace(v_new_parts[1], ',', '.')::numeric * CASE lower(v_new_parts[2]) WHEN 'kg' THEN 1000 WHEN 'l' THEN 1000 ELSE 1 END;
    IF v_new_grams IS NULL OR v_new_grams <= 0 THEN RAISE EXCEPTION 'invalid portion mass'; END IF;
    IF v_old_grams > 0 THEN v_factor := v_new_grams / v_old_grams; END IF;
  END IF;

  UPDATE public.daily_food_entries SET
    name = COALESCE(p_entry->>'name', name),
    brand = COALESCE(p_entry->>'brand', brand),
    calories = COALESCE((p_entry->>'calories')::integer, calories),
    protein = COALESCE((p_entry->>'protein')::numeric, protein),
    carbs = COALESCE((p_entry->>'carbs')::numeric, carbs),
    fat = COALESCE((p_entry->>'fat')::numeric, fat),
    fiber = CASE WHEN p_entry ? 'fiber' THEN (p_entry->>'fiber')::numeric ELSE round(fiber * v_factor, 1) END,
    sugar = CASE WHEN p_entry ? 'sugar' THEN (p_entry->>'sugar')::numeric ELSE round(sugar * v_factor, 1) END,
    saturated_fat = CASE WHEN p_entry ? 'saturated_fat' THEN (p_entry->>'saturated_fat')::numeric ELSE round(saturated_fat * v_factor, 1) END,
    salt = CASE WHEN p_entry ? 'salt' THEN (p_entry->>'salt')::numeric ELSE round(salt * v_factor, 2) END,
    meal_type = COALESCE(p_entry->>'meal_type', meal_type),
    amount = COALESCE(p_entry->>'amount', amount)
  WHERE id = p_entry_id AND user_id = p_user_id;

  PERFORM public._recompute_daily_nutrition(p_user_id, v_date);
END;
$function$;

REVOKE ALL ON FUNCTION public.update_food_entry(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_food_entry(uuid, uuid, jsonb) TO authenticated, service_role;
