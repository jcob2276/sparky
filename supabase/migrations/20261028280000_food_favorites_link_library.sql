-- Krok 1/3 scalenia food_favorites z food_library: ulubione staja sie cienka tabela uzycia (library_id + use_count/last_used/is_pinned).
-- Krok addytywny: brakujace pozycje trafiaja do biblioteki (wartosci skopiowane bez zmian), ulubione dostaja library_id.
-- Zadnych nadpisan wartosci odzywcze w istniejacych wierszach biblioteki. Kolumny odzywcze w food_favorites usuniemy dopiero po przepieciu kodu.
ALTER TABLE public.food_favorites ADD COLUMN IF NOT EXISTS library_id uuid REFERENCES public.food_library(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS food_favorites_library_id_idx ON public.food_favorites(library_id);

-- 1) dopasowanie: kod kreskowy ma pierwszenstwo, potem nazwa; przy wielu kandydatach najstarszy wiersz biblioteki
WITH cand AS (
  SELECT DISTINCT ON (f.id) f.id AS fav_id, l.id AS lib_id
  FROM public.food_favorites f
  JOIN public.food_library l ON l.user_id = f.user_id
   AND ((f.barcode IS NOT NULL AND f.barcode <> '' AND l.barcode = f.barcode)
        OR lower(btrim(l.name)) = lower(btrim(f.name)))
  ORDER BY f.id,
           (f.barcode IS NOT NULL AND f.barcode <> '' AND l.barcode = f.barcode) DESC,
           l.created_at ASC, l.id ASC
)
UPDATE public.food_favorites f SET library_id = cand.lib_id FROM cand WHERE f.id = cand.fav_id;

-- 2) niedopasowane ulubione -> nowe wiersze biblioteki (wartosci 1:1), potem podpiecie
WITH ins AS (
  INSERT INTO public.food_library (user_id, name, brand, barcode, calories, protein, carbs, fat, fiber, sugar,
                                   default_grams, source, created_at, validation_status, validation_reason,
                                   validated_at, saturated_fat, salt, nutrient_sources)
  SELECT f.user_id, f.name, f.brand, f.barcode, f.calories, f.protein, f.carbs, f.fat, f.fiber, f.sugar,
         f.default_grams, 'favorites', f.created_at, f.validation_status, f.validation_reason,
         f.validated_at, f.saturated_fat, f.salt, f.nutrient_sources
  FROM public.food_favorites f WHERE f.library_id IS NULL
  RETURNING id, user_id, name, brand, barcode, created_at
)
UPDATE public.food_favorites f SET library_id = ins.id
FROM ins
WHERE f.library_id IS NULL AND f.user_id = ins.user_id AND f.name = ins.name
  AND f.brand IS NOT DISTINCT FROM ins.brand AND f.barcode IS NOT DISTINCT FROM ins.barcode
  AND f.created_at = ins.created_at;
