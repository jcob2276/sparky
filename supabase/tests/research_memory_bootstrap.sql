-- Isolated bootstrap for the embedded PostgreSQL contract runner, never production.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA public, auth TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, service_role, anon;
CREATE TABLE public.entities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, canonical_name text, kind text, merged_into uuid, UNIQUE(user_id, canonical_name));
CREATE TABLE public.relations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE, is_singleton boolean NOT NULL DEFAULT false);
CREATE TABLE public.vanguard_entity_links(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users,
  source_entity text NOT NULL, source_type text NOT NULL, relation text NOT NULL,
  target_entity text NOT NULL, target_type text NOT NULL, weight float8 DEFAULT 1,
  first_seen date, last_seen date, evidence_count int DEFAULT 1, created_at timestamptz DEFAULT now(),
  layer text, valid_from timestamptz, valid_until timestamptz, observed_at timestamptz,
  status text CHECK(status IN ('active','historical','disputed','deprecated')),
  confidence_score float8 CHECK(confidence_score BETWEEN 0 AND 1), memory_type text,
  superseded_by uuid REFERENCES public.vanguard_entity_links DEFERRABLE INITIALLY DEFERRED,
  metadata jsonb, embedding text, source_episode_id uuid, temporal_status text, fact_text text,
  UNIQUE(user_id, source_entity, relation, target_entity)
);
CREATE TABLE public.claims(
  id uuid PRIMARY KEY, user_id uuid NOT NULL, subject_id uuid NOT NULL REFERENCES public.entities,
  relation_id uuid NOT NULL REFERENCES public.relations, object_id uuid NOT NULL REFERENCES public.entities,
  epistemic_status text, derivation text, source_observation_ids uuid[] NOT NULL DEFAULT '{}',
  weight float8, evidence_count int, learned_at timestamptz, valid_from timestamptz, valid_to timestamptz,
  status text, metadata jsonb, fact_text text, embedding text,
  superseded_by uuid REFERENCES public.claims ON UPDATE CASCADE ON DELETE SET NULL,
  UNIQUE(user_id, subject_id, relation_id, object_id, learned_at)
);
CREATE TABLE public.vanguard_preferences(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,key text NOT NULL,value text NOT NULL,is_active boolean DEFAULT true,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
ALTER TABLE public.vanguard_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY preference_owner ON public.vanguard_preferences FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vanguard_preferences TO authenticated;
CREATE FUNCTION public.canonicalize_vanguard_entity(uuid,text) RETURNS text LANGUAGE sql AS $$ SELECT btrim($2) $$;
CREATE TABLE public.entity_aliases(entity_id uuid REFERENCES public.entities, alias text);
