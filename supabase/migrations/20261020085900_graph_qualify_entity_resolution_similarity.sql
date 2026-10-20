-- Security hardening cleared search_path; pg_trgm lives in public in this project.
-- Preserve the existing entity-resolution function and qualify only its extension calls.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.resolve_entity_decision(uuid,text,text,double precision,double precision,double precision)'::regprocedure);
BEGIN
  EXECUTE replace(definition, ' similarity(', ' public.similarity(');
END;
$migration$;

-- Regression: unknown names must reach the fuzzy branch without a missing-function error.
DO $test$
BEGIN
  ASSERT public.resolve_entity_decision('00000000-0000-0000-0000-000000000000'::uuid,
    '__entity_resolution_regression__', 'person') IS NULL;
END;
$test$;
