-- Wyszukiwanie referencji USDA po angielskiej nazwie z parsera (bez zewnętrznego API embeddingów).
-- word_similarity dobrze znosi krótkie zapytanie wobec długiego opisu USDA; pierwszy człon opisu to rodzaj
-- produktu ("Chicken, ...", "Rice, ..."), więc zgodność z nim dostaje premię.
CREATE OR REPLACE FUNCTION public.search_food_reference_usda(
  query_text text,
  match_count integer DEFAULT 12
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
  score double precision
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH q AS (
    SELECT lower(trim(query_text)) AS t,
           lower(split_part(trim(query_text), ',', 1)) AS head
  )
  SELECT r.fdc_id, r.data_type, r.description, r.category, r.kcal, r.protein, r.fat, r.carbs,
         r.fiber, r.sugar, r.saturated_fat, r.salt, r.portions,
         (word_similarity(q.t, lower(r.description))
           + CASE WHEN lower(split_part(r.description, ',', 1)) = q.head THEN 0.15 ELSE 0 END
           + CASE WHEN r.data_type = 'foundation_food' THEN 0.02 ELSE 0 END)::double precision AS score
  FROM public.food_reference_usda r, q
  WHERE length(q.t) >= 3 AND q.t <% lower(r.description)
  ORDER BY score DESC, length(r.description) ASC
  LIMIT LEAST(GREATEST(match_count, 1), 30);
$$;

GRANT EXECUTE ON FUNCTION public.search_food_reference_usda(text, integer) TO authenticated, service_role;
