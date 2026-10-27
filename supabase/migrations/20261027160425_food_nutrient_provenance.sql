-- Preserve salt and the provenance of every nutrient in reusable products.
ALTER TABLE public.food_library ADD COLUMN salt numeric CHECK (salt >= 0 AND salt <= 100),
  ADD COLUMN nutrient_sources jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.food_favorites ADD COLUMN salt numeric CHECK (salt >= 0 AND salt <= 100),
  ADD COLUMN nutrient_sources jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP FUNCTION public.cache_food_to_library(uuid,text,text,text,numeric,numeric,numeric,numeric,numeric,numeric,integer,numeric);
CREATE FUNCTION public.cache_food_to_library(
  p_user_id uuid, p_name text, p_brand text, p_barcode text, p_calories numeric, p_protein numeric,
  p_carbs numeric, p_fat numeric, p_fiber numeric, p_sugar numeric, p_default_grams integer,
  p_saturated_fat numeric DEFAULT NULL, p_salt numeric DEFAULT NULL, p_nutrient_sources jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE sql SET search_path TO '' AS $function$
  INSERT INTO public.food_library
    (user_id,name,brand,barcode,calories,protein,carbs,fat,fiber,sugar,saturated_fat,salt,nutrient_sources,default_grams,source)
  VALUES
    (p_user_id,p_name,p_brand,p_barcode,p_calories,p_protein,p_carbs,p_fat,p_fiber,p_sugar,p_saturated_fat,p_salt,p_nutrient_sources,p_default_grams,'logged')
  ON CONFLICT (user_id,name,COALESCE(brand,'')) DO UPDATE SET
    fiber = CASE WHEN excluded.nutrient_sources->>'fiber' = 'data' OR food_library.fiber IS NULL THEN COALESCE(excluded.fiber,food_library.fiber) ELSE food_library.fiber END,
    sugar = CASE WHEN excluded.nutrient_sources->>'sugar' = 'data' OR food_library.sugar IS NULL THEN COALESCE(excluded.sugar,food_library.sugar) ELSE food_library.sugar END,
    saturated_fat = CASE WHEN excluded.nutrient_sources->>'saturated_fat' = 'data' OR food_library.saturated_fat IS NULL THEN COALESCE(excluded.saturated_fat,food_library.saturated_fat) ELSE food_library.saturated_fat END,
    salt = CASE WHEN excluded.nutrient_sources->>'salt' = 'data' OR food_library.salt IS NULL THEN COALESCE(excluded.salt,food_library.salt) ELSE food_library.salt END,
    nutrient_sources = food_library.nutrient_sources || CASE WHEN excluded.fiber IS NOT NULL AND (excluded.nutrient_sources->>'fiber' = 'data' OR food_library.fiber IS NULL) THEN jsonb_build_object('fiber',COALESCE(excluded.nutrient_sources->>'fiber','unknown')) ELSE '{}'::jsonb END || CASE WHEN excluded.sugar IS NOT NULL AND (excluded.nutrient_sources->>'sugar' = 'data' OR food_library.sugar IS NULL) THEN jsonb_build_object('sugar',COALESCE(excluded.nutrient_sources->>'sugar','unknown')) ELSE '{}'::jsonb END || CASE WHEN excluded.saturated_fat IS NOT NULL AND (excluded.nutrient_sources->>'saturated_fat' = 'data' OR food_library.saturated_fat IS NULL) THEN jsonb_build_object('saturated_fat',COALESCE(excluded.nutrient_sources->>'saturated_fat','unknown')) ELSE '{}'::jsonb END || CASE WHEN excluded.salt IS NOT NULL AND (excluded.nutrient_sources->>'salt' = 'data' OR food_library.salt IS NULL) THEN jsonb_build_object('salt',COALESCE(excluded.nutrient_sources->>'salt','unknown')) ELSE '{}'::jsonb END;
$function$;
REVOKE ALL ON FUNCTION public.cache_food_to_library(uuid,text,text,text,numeric,numeric,numeric,numeric,numeric,numeric,integer,numeric,numeric,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cache_food_to_library(uuid,text,text,text,numeric,numeric,numeric,numeric,numeric,numeric,integer,numeric,numeric,jsonb) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.add_food_entry(p_user_id uuid, p_date date, p_grams integer, p_entry jsonb)
 RETURNS uuid
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
    fiber, sugar, saturated_fat, salt, meal_type, amount, logged_at, meal_group_id, parse_meta,
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
    ROUND((p_entry->>'saturated_fat')::numeric * v_scale, 1),
    ROUND((p_entry->>'salt')::numeric * v_scale, 2),
    p_entry->>'meal_type', p_grams || ' g', now(), v_group,
    COALESCE(p_entry->'parse_meta', '{}'::jsonb)
      || jsonb_build_object('request_id', v_request_id),
    v_request_id
  )
  RETURNING id INTO v_id;

  INSERT INTO public.food_favorites (
    user_id, barcode, name, brand, calories, protein, carbs, fat, fiber, sugar, saturated_fat, salt, nutrient_sources,
    default_grams, is_pinned
  )
  VALUES (
    p_user_id, p_entry->>'barcode', p_entry->>'name', p_entry->>'brand',
    (p_entry->>'calories')::integer, (p_entry->>'protein')::numeric,
    (p_entry->>'carbs')::numeric, (p_entry->>'fat')::numeric,
    (p_entry->>'fiber')::numeric, (p_entry->>'sugar')::numeric,
    (p_entry->>'saturated_fat')::numeric, (p_entry->>'salt')::numeric,
    jsonb_strip_nulls(jsonb_build_object('fiber', CASE WHEN p_entry->>'fiber' IS NOT NULL THEN COALESCE(p_entry->'parse_meta'->'micronutrientSources'->>'fiber', 'unknown') END, 'sugar', CASE WHEN p_entry->>'sugar' IS NOT NULL THEN COALESCE(p_entry->'parse_meta'->'micronutrientSources'->>'sugar', 'unknown') END, 'saturated_fat', CASE WHEN p_entry->>'saturated_fat' IS NOT NULL THEN COALESCE(p_entry->'parse_meta'->'micronutrientSources'->>'saturated_fat', 'unknown') END, 'salt', CASE WHEN p_entry->>'salt' IS NOT NULL THEN COALESCE(p_entry->'parse_meta'->'micronutrientSources'->>'salt', 'unknown') END)),
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
    fiber = COALESCE(excluded.fiber, food_favorites.fiber),
    sugar = COALESCE(excluded.sugar, food_favorites.sugar),
    saturated_fat = COALESCE(excluded.saturated_fat, food_favorites.saturated_fat),
    salt = COALESCE(excluded.salt, food_favorites.salt),
    nutrient_sources = jsonb_strip_nulls(jsonb_build_object('fiber', CASE WHEN excluded.fiber IS NOT NULL THEN COALESCE(excluded.nutrient_sources->>'fiber', 'unknown') ELSE food_favorites.nutrient_sources->>'fiber' END, 'sugar', CASE WHEN excluded.sugar IS NOT NULL THEN COALESCE(excluded.nutrient_sources->>'sugar', 'unknown') ELSE food_favorites.nutrient_sources->>'sugar' END, 'saturated_fat', CASE WHEN excluded.saturated_fat IS NOT NULL THEN COALESCE(excluded.nutrient_sources->>'saturated_fat', 'unknown') ELSE food_favorites.nutrient_sources->>'saturated_fat' END, 'salt', CASE WHEN excluded.salt IS NOT NULL THEN COALESCE(excluded.nutrient_sources->>'salt', 'unknown') ELSE food_favorites.nutrient_sources->>'salt' END)),
    is_pinned = food_favorites.is_pinned;

  PERFORM public._recompute_daily_nutrition(p_user_id, p_date);
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.add_food_entry(uuid, date, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_food_entry(uuid, date, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_food_entry(uuid, date, integer, jsonb) TO service_role;

-- Retry only explicit historical mass units; pieces, packages and bare numbers stay unresolved.
UPDATE public.daily_food_entries
SET parse_meta = parse_meta - 'micronutrientBackfillAt' - 'micronutrientBackfillSkipped'
WHERE parse_meta->>'micronutrientBackfillSkipped' = 'no_grams'
  AND amount ~* '^\s*[0-9]+([.,][0-9]+)?\s*grams?\s*$';
