ALTER TABLE public.daily_food_entries
  ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS daily_food_entries_user_request_id_uidx
  ON public.daily_food_entries (user_id, request_id)
  WHERE request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.add_food_entry(
  p_user_id uuid,
  p_date date,
  p_grams integer,
  p_entry jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_id uuid;
  v_scale numeric := p_grams::numeric / 100;
  v_group uuid;
  v_request_id uuid := NULLIF(p_entry->>'request_id', '')::uuid;
  v_scaled_calories integer := ROUND((p_entry->>'calories')::numeric * v_scale)::integer;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || p_date::text, 0));

  IF v_request_id IS NOT NULL THEN
    SELECT id INTO v_id
    FROM public.daily_food_entries
    WHERE user_id = p_user_id
      AND request_id = v_request_id
    LIMIT 1;

    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  ELSE
    SELECT id INTO v_id
    FROM public.daily_food_entries
    WHERE user_id = p_user_id
      AND date = p_date
      AND name = p_entry->>'name'
      AND COALESCE(meal_type, '') = COALESCE(p_entry->>'meal_type', '')
      AND amount = p_grams || ' g'
      AND calories = v_scaled_calories
      AND logged_at >= now() - interval '5 seconds'
    ORDER BY logged_at DESC
    LIMIT 1;

    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  v_group := NULLIF(p_entry->>'meal_group_id', '')::uuid;

  INSERT INTO public.daily_food_entries (
    user_id, date, name, brand, calories, protein, carbs, fat,
    fiber, sugar, meal_type, amount, logged_at, meal_group_id, parse_meta,
    request_id
  ) VALUES (
    p_user_id, p_date,
    p_entry->>'name', p_entry->>'brand',
    v_scaled_calories,
    ROUND((p_entry->>'protein')::numeric * v_scale, 1),
    ROUND((p_entry->>'carbs')::numeric * v_scale, 1),
    ROUND((p_entry->>'fat')::numeric * v_scale, 1),
    ROUND((p_entry->>'fiber')::numeric * v_scale, 1),
    ROUND((p_entry->>'sugar')::numeric * v_scale, 1),
    p_entry->>'meal_type', p_grams || ' g', now(), v_group,
    COALESCE(p_entry->'parse_meta', '{}'::jsonb)
      || jsonb_build_object('request_id', v_request_id),
    v_request_id
  )
  RETURNING id INTO v_id;

  INSERT INTO public.food_favorites (
    user_id, barcode, name, brand, calories, protein, carbs, fat, fiber, sugar,
    default_grams, is_pinned
  )
  VALUES (
    p_user_id, p_entry->>'barcode', p_entry->>'name', p_entry->>'brand',
    (p_entry->>'calories')::integer, (p_entry->>'protein')::numeric,
    (p_entry->>'carbs')::numeric, (p_entry->>'fat')::numeric,
    (p_entry->>'fiber')::numeric, (p_entry->>'sugar')::numeric,
    p_grams, false
  )
  ON CONFLICT (user_id, name, (COALESCE(brand, ''))) DO UPDATE SET
    use_count = food_favorites.use_count + 1,
    last_used = now(),
    default_grams = p_grams,
    barcode = COALESCE(excluded.barcode, food_favorites.barcode),
    calories = excluded.calories,
    protein = excluded.protein,
    carbs = excluded.carbs,
    fat = excluded.fat,
    fiber = excluded.fiber,
    sugar = excluded.sugar,
    is_pinned = food_favorites.is_pinned;

  PERFORM public._recompute_daily_nutrition(p_user_id, p_date);
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.add_food_entry(uuid, date, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_food_entry(uuid, date, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_food_entry(uuid, date, integer, jsonb) TO service_role;
