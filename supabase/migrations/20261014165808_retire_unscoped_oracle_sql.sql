-- Deploy the structured Oracle data reader before applying this migration.
-- Read-only mode does not establish row ownership for a SECURITY DEFINER RPC.
REVOKE ALL ON FUNCTION public.oracle_readonly_query(text) FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON FUNCTION public.oracle_readonly_query(text) IS
  'Retired: unscoped SQL execution is disabled. Oracle uses allowlisted owner-scoped Data API reads.';
