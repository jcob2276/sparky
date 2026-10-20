-- Views are read-only by design in this app (no code path writes to them), yet anon and
-- authenticated held INSERT/UPDATE/DELETE/TRUNCATE on every public view. Revoke as defence in depth.
DO $$
DECLARE v record;
BEGIN
  FOR v IN SELECT c.relname FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'v' LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon, authenticated', v.relname);
  END LOOP;
END
$$;
