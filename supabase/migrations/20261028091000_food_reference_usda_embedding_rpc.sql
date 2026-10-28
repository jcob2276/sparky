-- Zapis embeddingów referencji USDA porcjami (jedna aktualizacja zamiast setek żądań).
CREATE OR REPLACE FUNCTION public.set_food_reference_embeddings(items jsonb)
RETURNS integer
LANGUAGE sql
SET search_path = public
AS $$
  WITH updated AS (
    UPDATE public.food_reference_usda r
    SET embedding = (i.embedding)::vector(1536), embedded_at = now()
    FROM jsonb_to_recordset(items) AS i(fdc_id integer, embedding text)
    WHERE r.fdc_id = i.fdc_id
    RETURNING 1
  )
  SELECT count(*)::integer FROM updated;
$$;

REVOKE ALL ON FUNCTION public.set_food_reference_embeddings(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_food_reference_embeddings(jsonb) TO service_role;
