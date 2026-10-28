-- Referencja USDA FoodData Central (Foundation Foods + SR Legacy), domena publiczna CC0.
-- Wartości na 100 g w kontrakcie Sparky; węglowodany `carbs` są przyswajalne (bez błonnika) jak na etykiecie UE.
-- Embedding opisu (Gemini, 1536) służy do dopasowania polskich nazw produktów do angielskich opisów USDA.

CREATE TABLE IF NOT EXISTS public.food_reference_usda (
  fdc_id integer PRIMARY KEY,
  data_type text NOT NULL CHECK (data_type IN ('foundation_food', 'sr_legacy_food')),
  description text NOT NULL,
  category text,
  publication_date date,
  kcal numeric NOT NULL CHECK (kcal >= 0),
  energy_source text NOT NULL CHECK (energy_source IN ('measured', 'atwater_specific', 'atwater_general', 'computed_4_4_9')),
  protein numeric NOT NULL CHECK (protein >= 0),
  fat numeric NOT NULL CHECK (fat >= 0),
  carbs numeric NOT NULL CHECK (carbs >= 0),
  carbs_by_difference numeric,
  fiber numeric,
  sugar numeric,
  saturated_fat numeric,
  salt numeric,
  portions jsonb NOT NULL DEFAULT '[]'::jsonb,
  embedding vector(1536),
  embedded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.food_reference_usda IS 'USDA FoodData Central (Foundation + SR Legacy), CC0. Wartości na 100 g; braki = NULL, nie 0.';

ALTER TABLE public.food_reference_usda ENABLE ROW LEVEL SECURITY;

-- Dane referencyjne są publiczne; zapis tylko serwisowy (bez polityk zapisu).
CREATE POLICY food_reference_usda_read ON public.food_reference_usda
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.food_reference_usda TO authenticated;

CREATE INDEX IF NOT EXISTS idx_food_reference_usda_embedding
  ON public.food_reference_usda USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_food_reference_usda_description_trgm
  ON public.food_reference_usda USING gin (description gin_trgm_ops);

-- Najbliższe pozycje do zapytania (embedding polskiej lub angielskiej nazwy). Foundation dostaje drobną premię:
-- to nowsze analizy z opisanym pochodzeniem próbek.
CREATE OR REPLACE FUNCTION public.match_food_reference_usda(
  query_embedding vector(1536),
  match_count integer DEFAULT 8
)
RETURNS TABLE (
  fdc_id integer,
  data_type text,
  description text,
  category text,
  kcal numeric,
  protein numeric,
  fat numeric,
  carbs numeric,
  fiber numeric,
  sugar numeric,
  saturated_fat numeric,
  salt numeric,
  portions jsonb,
  similarity double precision
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT r.fdc_id, r.data_type, r.description, r.category, r.kcal, r.protein, r.fat, r.carbs,
         r.fiber, r.sugar, r.saturated_fat, r.salt, r.portions,
         (1 - (r.embedding <=> query_embedding))::double precision
           + CASE WHEN r.data_type = 'foundation_food' THEN 0.01 ELSE 0 END AS similarity
  FROM public.food_reference_usda r
  WHERE r.embedding IS NOT NULL
  ORDER BY r.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 25);
$$;

GRANT EXECUTE ON FUNCTION public.match_food_reference_usda(vector, integer) TO authenticated, service_role;
