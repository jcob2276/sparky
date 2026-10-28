-- Krok 3/3 scalenia jedzenia: food_favorites tylko jako uzycie (library_id, use_count, last_used, is_pinned, default_grams).
-- Kolumny produktowe zyja wylacznie w food_library (kopia dawnych wartosci: archive.food_favorites_pre_merge). Frontend i funkcje czytaja juz biblioteke.
CREATE OR REPLACE FUNCTION public.add_food_entry(p_user_id uuid, p_date date, p_grams integer, p_entry jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_id uuid;
  v_library_id uuid;
  v_scale numeric := p_grams::numeric / 100;
  v_group uuid;
  v_request_id uuid := NULLIF(p_entry->>'request_id', '')::uuid;
  v_scaled_calories integer := ROUND((p_entry->>'calories')::numeric * v_scale)::integer;
BEGIN
  IF p_grams IS NULL OR p_grams<=0 OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid portion or owner';
  END IF;
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

  v_library_id := NULLIF(p_entry->>'library_id','')::uuid;
  IF v_library_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.food_library WHERE id=v_library_id AND user_id=p_user_id) THEN
      RAISE EXCEPTION 'forbidden library product';
    END IF;
  ELSE
    v_library_id := public.ensure_food_library(p_user_id,p_entry || jsonb_build_object(
      'nutrient_sources',jsonb_strip_nulls(jsonb_build_object(
        'fiber',CASE WHEN p_entry->>'fiber' IS NOT NULL THEN coalesce(p_entry->'parse_meta'->'micronutrientSources'->>'fiber','unknown') END,
        'sugar',CASE WHEN p_entry->>'sugar' IS NOT NULL THEN coalesce(p_entry->'parse_meta'->'micronutrientSources'->>'sugar','unknown') END,
        'saturated_fat',CASE WHEN p_entry->>'saturated_fat' IS NOT NULL THEN coalesce(p_entry->'parse_meta'->'micronutrientSources'->>'saturated_fat','unknown') END,
        'salt',CASE WHEN p_entry->>'salt' IS NOT NULL THEN coalesce(p_entry->'parse_meta'->'micronutrientSources'->>'salt','unknown') END
      ))),p_grams);
  END IF;
  INSERT INTO public.food_favorites(user_id,library_id,default_grams,is_pinned)
  VALUES(p_user_id,v_library_id,p_grams,false)
  ON CONFLICT (user_id,library_id) DO UPDATE SET
    use_count=food_favorites.use_count+1,last_used=now(),default_grams=p_grams;

  PERFORM public._recompute_daily_nutrition(p_user_id, p_date);
  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.add_food_entry(uuid, date, integer, jsonb) TO authenticated, service_role;

ALTER TABLE public.food_favorites DROP CONSTRAINT IF EXISTS food_favorites_library_id_fkey;
ALTER TABLE public.food_favorites ALTER COLUMN library_id SET NOT NULL;
ALTER TABLE public.food_favorites ADD CONSTRAINT food_favorites_library_id_fkey FOREIGN KEY (library_id) REFERENCES public.food_library(id) ON DELETE CASCADE;
DROP INDEX IF EXISTS public.food_favorites_active_name_idx;
ALTER TABLE public.food_favorites
  DROP COLUMN IF EXISTS barcode,
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS brand,
  DROP COLUMN IF EXISTS calories,
  DROP COLUMN IF EXISTS protein,
  DROP COLUMN IF EXISTS carbs,
  DROP COLUMN IF EXISTS fat,
  DROP COLUMN IF EXISTS fiber,
  DROP COLUMN IF EXISTS sugar,
  DROP COLUMN IF EXISTS saturated_fat,
  DROP COLUMN IF EXISTS salt,
  DROP COLUMN IF EXISTS nutrient_sources,
  DROP COLUMN IF EXISTS validation_status,
  DROP COLUMN IF EXISTS validation_reason,
  DROP COLUMN IF EXISTS validated_at;
