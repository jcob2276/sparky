-- Large SEC tables must commit atomically; Bridgewater's 15,821-row filing
-- exceeds the REST role's default 8-second timeout. Scope the exception to
-- this service-role-only RPC; public reads and all role limits stay unchanged.
-- https://supabase.com/docs/guides/database/postgres/timeouts#function-level
ALTER FUNCTION public.replace_sec13f_positions_with_summary(text,jsonb,integer,numeric,numeric,integer)
  SET statement_timeout TO '30s';
NOTIFY pgrst,'reload schema';
