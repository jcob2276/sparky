-- Krok 2/3 scalenia food_favorites z food_library: ulubione = cienka tabela uzycia (unikalne user_id+library_id), katalog produktow w food_library.
-- Kopia zapasowa przed scaleniem duplikatow uzycia; wartosci produktow w bibliotece NIE sa zmieniane.
-- add_food_entry do czasu kroku 3 wypelnia tez stare kolumny food_favorites z biblioteki (zgodnosc ze starym frontendem).
CREATE TABLE IF NOT EXISTS archive.food_favorites_pre_merge AS SELECT * FROM public.food_favorites;
REVOKE ALL ON archive.food_favorites_pre_merge FROM anon, authenticated;
LOCK TABLE public.food_favorites, public.food_library IN SHARE ROW EXCLUSIVE MODE;

-- Abort if step 1 did not attach every favorite to its owner's catalog.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.food_favorites f LEFT JOIN public.food_library l
    ON l.id=f.library_id AND l.user_id=f.user_id WHERE l.id IS NULL) THEN
    RAISE EXCEPTION 'Unlinked or cross-owner favorite; finish step 1 first';
  END IF;
END $$;

-- Keep the most recently used portion; combine only usage, never product values.
WITH grouped AS (
  SELECT user_id,library_id,(array_agg(id ORDER BY last_used DESC,id))[1] AS keep_id,
    sum(use_count)::integer AS uses,bool_or(is_pinned) AS pinned,max(last_used) AS used
  FROM public.food_favorites GROUP BY user_id,library_id
)
UPDATE public.food_favorites f SET use_count=g.uses,is_pinned=g.pinned,last_used=g.used
FROM grouped g WHERE f.id=g.keep_id;
WITH ranked AS (
  SELECT id,row_number() OVER (PARTITION BY user_id,library_id ORDER BY last_used DESC,id) AS n
  FROM public.food_favorites
)
DELETE FROM public.food_favorites f USING ranked r WHERE f.id=r.id AND r.n>1;
CREATE UNIQUE INDEX IF NOT EXISTS food_favorites_user_library_key
  ON public.food_favorites(user_id,library_id);

-- Step-2 inserts omit legacy columns; step 3 may drop them separately.
ALTER TABLE public.food_favorites ALTER COLUMN name DROP NOT NULL;
DROP INDEX IF EXISTS public.food_favorites_user_name_brand_key;
-- Barcode-bearing products with the same name/brand can be distinct products.
-- Catalog writes below serialize per owner, so no nutrient rows need deduplicating.
DROP INDEX IF EXISTS public.food_library_user_name_brand_key;

CREATE OR REPLACE FUNCTION public.ensure_food_library(p_user_id uuid,p_food jsonb,p_default_grams integer)
RETURNS uuid LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE
  v_id uuid;
  v_name text := btrim(p_food->>'name');
  v_barcode text := nullif(btrim(p_food->>'barcode'),'');
BEGIN
  IF p_user_id IS NULL OR (auth.uid() IS NOT NULL AND auth.uid() <> p_user_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_name IS NULL OR v_name='' OR p_default_grams IS NULL OR p_default_grams<=0 THEN
    RAISE EXCEPTION 'invalid food or portion';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('food-library:' || p_user_id::text,0));
  SELECT id INTO v_id FROM public.food_library
  WHERE user_id=p_user_id AND
    ((v_barcode IS NOT NULL AND barcode=v_barcode) OR
     (v_barcode IS NULL AND lower(btrim(name))=lower(v_name)))
  ORDER BY created_at,id LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO public.food_library(user_id,name,brand,barcode,calories,protein,carbs,fat,fiber,sugar,
    saturated_fat,salt,nutrient_sources,default_grams,source,validation_status,validation_reason,validated_at)
  VALUES (p_user_id,v_name,p_food->>'brand',v_barcode,(p_food->>'calories')::numeric,
    (p_food->>'protein')::numeric,(p_food->>'carbs')::numeric,(p_food->>'fat')::numeric,
    (p_food->>'fiber')::numeric,(p_food->>'sugar')::numeric,(p_food->>'saturated_fat')::numeric,
    (p_food->>'salt')::numeric,coalesce(p_food->'nutrient_sources','{}'::jsonb),p_default_grams,
    coalesce(p_food->>'source','logged'),coalesce(p_food->>'validation_status','unreviewed'),
    p_food->>'validation_reason',(p_food->>'validated_at')::timestamptz)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.ensure_food_library(uuid,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ensure_food_library(uuid,jsonb,integer) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.cache_food_to_library(
  p_user_id uuid,p_name text,p_brand text,p_barcode text,p_calories numeric,p_protein numeric,
  p_carbs numeric,p_fat numeric,p_fiber numeric,p_sugar numeric,p_default_grams integer,
  p_saturated_fat numeric DEFAULT NULL,p_salt numeric DEFAULT NULL,p_nutrient_sources jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  PERFORM public.ensure_food_library(p_user_id,jsonb_build_object('name',p_name,'brand',p_brand,
    'barcode',p_barcode,'calories',p_calories,'protein',p_protein,'carbs',p_carbs,'fat',p_fat,
    'fiber',p_fiber,'sugar',p_sugar,'saturated_fat',p_saturated_fat,'salt',p_salt,
    'nutrient_sources',p_nutrient_sources),p_default_grams);
END $$;
REVOKE ALL ON FUNCTION public.cache_food_to_library(uuid,text,text,text,numeric,numeric,numeric,numeric,numeric,numeric,integer,numeric,numeric,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cache_food_to_library(uuid,text,text,text,numeric,numeric,numeric,numeric,numeric,numeric,integer,numeric,numeric,jsonb) TO authenticated,service_role;

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
  INSERT INTO public.food_favorites(user_id,library_id,default_grams,is_pinned,name,brand,barcode,calories,protein,carbs,fat,fiber,sugar,saturated_fat,salt,nutrient_sources)
  SELECT p_user_id,l.id,p_grams,false,l.name,l.brand,l.barcode,round(l.calories)::integer,l.protein,l.carbs,l.fat,l.fiber,l.sugar,l.saturated_fat,l.salt,l.nutrient_sources
  FROM public.food_library l WHERE l.id=v_library_id
  ON CONFLICT (user_id,library_id) DO UPDATE SET
    use_count=food_favorites.use_count+1,last_used=now(),default_grams=p_grams;

  PERFORM public._recompute_daily_nutrition(p_user_id, p_date);
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.add_food_entry(uuid, date, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_food_entry(uuid, date, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_food_entry(uuid, date, integer, jsonb) TO service_role;


