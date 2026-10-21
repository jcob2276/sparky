-- Produkty zapisywane do biblioteki (np. po skanie kodu) zachowują tłuszcze nasycone.
DROP FUNCTION IF EXISTS public.cache_food_to_library(uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer);
CREATE OR REPLACE FUNCTION public.cache_food_to_library(
  p_user_id uuid, p_name text, p_brand text, p_barcode text, p_calories numeric, p_protein numeric,
  p_carbs numeric, p_fat numeric, p_fiber numeric, p_sugar numeric, p_default_grams integer,
  p_saturated_fat numeric DEFAULT NULL
)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  INSERT INTO public.food_library
    (user_id, name, brand, barcode, calories, protein, carbs, fat, fiber, sugar, saturated_fat, default_grams, source)
  VALUES
    (p_user_id, p_name, p_brand, p_barcode, p_calories, p_protein, p_carbs, p_fat, p_fiber, p_sugar, p_saturated_fat, p_default_grams, 'logged')
  ON CONFLICT (user_id, name, COALESCE(brand, '')) DO NOTHING;
$function$;
