-- Scalenie słowników grafu, część 2: stare tabele do archiwum i usunięcie z public.
-- Po części 1 (20261028210000) i wdrożeniu vanguard-capture nic ich nie czyta (funkcje SQL, trigger i kod przełączone na
-- entity_aliases i relations; zweryfikowane: 12 z 12 aliasów i 74 z 74 relacji istnieje w nowych tabelach).
-- Ukryta zależność: vanguard_entity_links.relation miał klucz obcy (NOT VALID, nigdy niezwalidowany) do
-- vanguard_relation_ontology. Przekierowany na relations(name) i zwalidowany (wszystkie relacje powiązań istnieją w relations).
-- Cofnięcie: CREATE TABLE public.<nazwa> (LIKE archive.<nazwa>); INSERT INTO public.<nazwa> SELECT * FROM archive.<nazwa>;
--            klucz obcy odtworzyć jako FOREIGN KEY (relation) REFERENCES public.vanguard_relation_ontology (relation) NOT VALID.

ALTER TABLE public.vanguard_entity_links DROP CONSTRAINT IF EXISTS vanguard_entity_links_relation_fkey;
ALTER TABLE public.vanguard_entity_links
  ADD CONSTRAINT vanguard_entity_links_relation_fkey
  FOREIGN KEY (relation) REFERENCES public.relations (name) ON UPDATE CASCADE NOT VALID;
ALTER TABLE public.vanguard_entity_links VALIDATE CONSTRAINT vanguard_entity_links_relation_fkey;

CREATE SCHEMA IF NOT EXISTS archive;
CREATE TABLE IF NOT EXISTS archive.vanguard_entity_aliases AS TABLE public.vanguard_entity_aliases;
CREATE TABLE IF NOT EXISTS archive.vanguard_relation_ontology AS TABLE public.vanguard_relation_ontology;
REVOKE ALL ON ALL TABLES IN SCHEMA archive FROM PUBLIC, anon, authenticated;

DROP TABLE public.vanguard_entity_aliases;
DROP TABLE public.vanguard_relation_ontology;
