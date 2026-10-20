-- Wrap bare auth.uid()/auth.role() calls in RLS policies with (select ...) so Postgres
-- evaluates them once per statement (initplan) instead of once per row.
-- Semantics are unchanged; only already-unwrapped expressions are rewritten.
DO $$
DECLARE
  pol record;
  new_qual text;
  new_check text;
  sql text;
  rewrite_count int := 0;
  -- negative lookbehind is unavailable in PG regex, so protect wrapped calls first
  protect constant text := '(select\s+)auth\.(uid|role)\(\)';
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    new_qual := pol.qual;
    new_check := pol.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, protect, '\1@@\2@@', 'gi');
      new_qual := regexp_replace(new_qual, 'auth\.(uid|role)\(\)', '(select auth.\1())', 'g');
      new_qual := regexp_replace(new_qual, '@@(uid|role)@@', 'auth.\1()', 'g');
    END IF;
    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, protect, '\1@@\2@@', 'gi');
      new_check := regexp_replace(new_check, 'auth\.(uid|role)\(\)', '(select auth.\1())', 'g');
      new_check := regexp_replace(new_check, '@@(uid|role)@@', 'auth.\1()', 'g');
    END IF;

    IF new_qual IS DISTINCT FROM pol.qual OR new_check IS DISTINCT FROM pol.with_check THEN
      sql := format('ALTER POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
      IF new_qual IS NOT NULL THEN sql := sql || ' USING (' || new_qual || ')'; END IF;
      IF new_check IS NOT NULL THEN sql := sql || ' WITH CHECK (' || new_check || ')'; END IF;
      EXECUTE sql;
      rewrite_count := rewrite_count + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'rewrote % policies', rewrite_count;
END
$$;
