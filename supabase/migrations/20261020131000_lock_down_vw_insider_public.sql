-- vw_insider_public was SECURITY DEFINER and auto-updatable, with INSERT/UPDATE/DELETE/TRUNCATE
-- granted to anon/authenticated: anonymous writes would reach insider_trades with owner rights.
-- The view has no consumers (legacy); keep it read-only and subject to the caller's RLS.
ALTER VIEW public.vw_insider_public SET (security_invoker = true);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.vw_insider_public FROM anon, authenticated;
