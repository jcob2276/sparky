-- find_mentioned_entities: pusty search_path nie widział similarity() (pg_trgm, schemat public), więc każde wywołanie
-- kończyło się błędem 42883 i Oracle (ragPipeline.ts) nie dostawał wspomnianych encji. Pełna kwalifikacja public.similarity.
-- Wykryte 2026-10-28 przy scalaniu słowników aliasów (poprzednia wersja miała ten sam błąd).
--
-- Cofnięcie: CREATE OR REPLACE z unqualified similarity (wersja z migracji 20261028210000), czyli stan zepsuty.

CREATE OR REPLACE FUNCTION public.find_mentioned_entities(query_text text, user_id_param uuid)
 RETURNS TABLE(entity_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_query text := lower(coalesce(query_text, ''));
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT source_entity AS name FROM public.vanguard_entity_links WHERE user_id = user_id_param
    UNION
    SELECT target_entity AS name FROM public.vanguard_entity_links WHERE user_id = user_id_param
    UNION
    SELECT ea.alias AS name
      FROM public.entity_aliases ea
      JOIN public.entities e ON e.id = ea.entity_id
     WHERE e.user_id = user_id_param
  ),
  matched AS (
    SELECT DISTINCT public.canonicalize_vanguard_entity(user_id_param, c.name) AS canonical_name
    FROM candidates c
    WHERE v_query ILIKE '%' || lower(c.name) || '%'
       OR public.similarity(v_query, lower(c.name)) > 0.35
  )
  SELECT canonical_name
  FROM matched
  WHERE canonical_name IS NOT NULL AND canonical_name <> '';
END;
$function$;

REVOKE ALL ON FUNCTION public.find_mentioned_entities(text, uuid) FROM PUBLIC, anon;
