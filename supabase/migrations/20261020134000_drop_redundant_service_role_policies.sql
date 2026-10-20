-- service_role has BYPASSRLS, so permissive policies that only grant access to service_role
-- (either TO service_role USING (true), or auth.role() = 'service_role') are no-ops. They
-- trigger multiple_permissive_policies warnings and cost an extra policy evaluation per query.
-- Dropped only where the table keeps at least one other permissive policy.
DO $$
DECLARE
  pol record;
  dropped int := 0;
  svc_expr constant text := '^\(?\s*\(\s*select auth\.role\(\) as role\)\s*=\s*''service_role''::text\s*\)?$';
BEGIN
  FOR pol IN
    SELECT p.schemaname, p.tablename, p.policyname
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.permissive = 'PERMISSIVE'
      AND (
        (p.roles::text = '{service_role}'
          AND coalesce(p.qual, 'true') = 'true' AND coalesce(p.with_check, 'true') = 'true')
        OR (p.roles::text = '{public}'
          AND lower(coalesce(p.qual, '')) ~ svc_expr
          AND (p.with_check IS NULL OR lower(p.with_check) ~ svc_expr))
      )
      AND EXISTS (
        SELECT 1 FROM pg_policies o
        WHERE o.schemaname = p.schemaname AND o.tablename = p.tablename
          AND o.policyname <> p.policyname AND o.permissive = 'PERMISSIVE'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    dropped := dropped + 1;
  END LOOP;
  RAISE NOTICE 'dropped % redundant service_role policies', dropped;
END
$$;
