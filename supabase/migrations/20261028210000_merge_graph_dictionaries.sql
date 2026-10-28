-- Scalenie słowników grafu wiedzy (część 1): jedna lista relacji (relations) i jeden słownik aliasów (entity_aliases).
-- Stan z 2026-10-28: vanguard_relation_ontology (74) i relations (66) dopełniały się (22 tylko w ontologii, 14 tylko w relations),
-- a vanguard_entity_aliases (12 aliasów, wszystkie na encję „Jakub”) działał obok entity_aliases (246).
-- Część 2 (osobna migracja) usuwa stare tabele po wdrożeniu vanguard-capture, który czyta i zapisuje relations.
--
-- Cofnięcie: przywrócić funkcje i trigger z migracji 20260714185005_restore_canonicalize_vanguard_entity.sql
--            oraz definicji check_vanguard_relation_ontology z bazowej migracji; dane starych tabel nadal istnieją do części 2.

-- 1. relations: opis relacji (z ontologii) i brakujące pozycje.
ALTER TABLE public.relations ADD COLUMN IF NOT EXISTS description text;

INSERT INTO public.relations (name, is_singleton)
SELECT o.relation, false
  FROM public.vanguard_relation_ontology o
 WHERE NOT EXISTS (SELECT 1 FROM public.relations r WHERE r.name = o.relation);

UPDATE public.relations r
   SET description = o.description
  FROM public.vanguard_relation_ontology o
 WHERE o.relation = r.name AND r.description IS NULL AND o.description IS NOT NULL;

COMMENT ON COLUMN public.relations.description IS 'Opis relacji dla ekstrakcji grafu (dawniej vanguard_relation_ontology.description).';
COMMENT ON TABLE public.relations IS 'Jedyna lista dozwolonych relacji grafu wiedzy; trigger trigger_check_vanguard_relation wymaga, by relacja powiązania istniała tutaj.';

-- 2. Aliasy: stare wpisy do entity_aliases (po nazwie kanonicznej encji tego samego użytkownika).
INSERT INTO public.entity_aliases (entity_id, alias)
SELECT e.id, a.alias
  FROM public.vanguard_entity_aliases a
  JOIN public.entities e ON e.user_id = a.user_id AND lower(e.canonical_name) = lower(a.canonical)
 WHERE NOT EXISTS (
         SELECT 1 FROM public.entity_aliases ea WHERE ea.entity_id = e.id AND lower(ea.alias) = lower(a.alias))
ON CONFLICT (entity_id, alias) DO NOTHING;

-- 3. Funkcje czytają nowe tabele.
CREATE OR REPLACE FUNCTION public.canonicalize_vanguard_entity(p_user_id uuid, p_name text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
  v_name text := btrim(coalesce(p_name, ''));
  v_lower text := lower(btrim(coalesce(p_name, '')));
  v_canonical text;
BEGIN
  IF v_name = '' THEN
    RETURN v_name;
  END IF;

  -- Alias -> encja (po scaleniu encji wskazuje na encję docelową).
  SELECT COALESCE(t.canonical_name, e.canonical_name)
    INTO v_canonical
    FROM public.entity_aliases AS ea
    JOIN public.entities AS e ON e.id = ea.entity_id AND e.user_id = p_user_id
    LEFT JOIN public.entities AS t ON t.id = e.merged_into
   WHERE lower(ea.alias) = v_lower
   LIMIT 1;

  IF v_canonical IS NOT NULL THEN
    RETURN v_canonical;
  END IF;

  IF v_lower IN (
    'jakub', 'uzytkownik', 'użytkownik', 'uzytkownika', 'użytkownika',
    'osoba', 'person', 'student', 'user', 'ja', 'mnie', 'mi', 'mną', 'mna'
  ) THEN
    RETURN 'Jakub';
  END IF;

  RETURN v_name;
END;
$function$;

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
       OR similarity(v_query, lower(c.name)) > 0.35
  )
  SELECT canonical_name
  FROM matched
  WHERE canonical_name IS NOT NULL AND canonical_name <> '';
END;
$function$;

-- 4. Trigger relacji sprawdza listę relations (zamiast vanguard_relation_ontology).
CREATE OR REPLACE FUNCTION public.check_graph_relation_known()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_count integer;
BEGIN
  NEW.relation := btrim(NEW.relation);

  IF NEW.relation IS NULL OR NEW.relation = '' THEN
    RAISE EXCEPTION 'Graph relation cannot be empty';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.relations WHERE name = NEW.relation) THEN
    SELECT count(*) INTO v_count FROM public.relations;
    RAISE EXCEPTION 'Graph relation "%" is outside relations (% allowed relations)', NEW.relation, v_count;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.check_graph_relation_known() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_check_vanguard_relation ON public.vanguard_entity_links;
CREATE TRIGGER trigger_check_vanguard_relation
  BEFORE INSERT OR UPDATE OF relation ON public.vanguard_entity_links
  FOR EACH ROW EXECUTE FUNCTION public.check_graph_relation_known();

DROP FUNCTION IF EXISTS public.check_vanguard_relation_ontology();
