-- Read-only metadata for the signed-in owner's sessions. No token or key leaves auth.
CREATE OR REPLACE FUNCTION public.list_my_sessions()
RETURNS TABLE (
  id uuid,
  user_agent text,
  ip text,
  created_at timestamptz,
  last_refreshed_at timestamptz,
  is_current boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  RETURN QUERY
  SELECT s.id, s.user_agent, host(s.ip), s.created_at,
    -- GoTrue stores refreshed_at as a UTC timestamp without a timezone.
    coalesce(s.refreshed_at AT TIME ZONE 'UTC', s.created_at),
    coalesce(s.id::text = (auth.jwt()->>'session_id'), false)
  FROM auth.sessions s
  WHERE s.user_id = v_user_id
    AND (s.not_after IS NULL OR s.not_after > statement_timestamp())
    -- Support both legacy refresh tokens and GoTrue's HMAC session tokens.
    AND (
      (s.refresh_token_hmac_key IS NOT NULL AND s.refresh_token_counter IS NOT NULL)
      OR EXISTS (
        SELECT 1 FROM auth.refresh_tokens r
        WHERE r.session_id = s.id AND r.revoked = false
      )
    )
  ORDER BY 6 DESC, 5 DESC NULLS LAST, s.id;
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_sessions() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_my_sessions() TO authenticated;

COMMENT ON FUNCTION public.list_my_sessions() IS
  'Own unexpired sessions with refresh credentials; metadata only. Last refresh is not online presence.';
