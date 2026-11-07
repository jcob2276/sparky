-- auth.sessions remains the authority for access. This table keeps only ended-session metadata.
CREATE TABLE public.auth_session_history (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_agent text,
  ip text,
  created_at timestamptz,
  last_refreshed_at timestamptz,
  authentication_methods text[] NOT NULL DEFAULT '{}',
  ended_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
COMMENT ON COLUMN public.auth_session_history.id IS
  'Historical session identifier; deliberately not an FK because the auth.sessions row has ended.';
CREATE INDEX auth_session_history_user_ended_idx ON public.auth_session_history(user_id, ended_at DESC);
ALTER TABLE public.auth_session_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_session_history_read_own ON public.auth_session_history
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
REVOKE ALL ON public.auth_session_history FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.auth_session_history TO authenticated;

CREATE SCHEMA IF NOT EXISTS private;
CREATE FUNCTION private.session_has_access(p_session_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.sessions s
    WHERE s.id = p_session_id AND s.user_id = p_user_id
      AND (s.not_after IS NULL OR s.not_after > statement_timestamp())
      AND ((s.refresh_token_hmac_key IS NOT NULL AND s.refresh_token_counter IS NOT NULL)
        OR EXISTS (SELECT 1 FROM auth.refresh_tokens r WHERE r.session_id = s.id AND r.revoked = false))
  );
$$;
REVOKE ALL ON FUNCTION private.session_has_access(uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.is_current_session_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN auth.jwt()->>'session_id' ~ '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$'
    THEN private.session_has_access((auth.jwt()->>'session_id')::uuid, auth.uid())
    ELSE false END;
$$;
REVOKE ALL ON FUNCTION public.is_current_session_active() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_current_session_active() TO authenticated;

CREATE FUNCTION private.archive_ended_auth_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- A cascading account deletion must not reinsert personal data or block Auth's deletion.
  IF EXISTS (SELECT 1 FROM auth.users u WHERE u.id = OLD.user_id) THEN
    INSERT INTO public.auth_session_history
      (id,user_id,user_agent,ip,created_at,last_refreshed_at,authentication_methods)
    SELECT OLD.id,OLD.user_id,OLD.user_agent,host(OLD.ip),OLD.created_at,
      coalesce(OLD.refreshed_at AT TIME ZONE 'UTC',OLD.created_at),
      ARRAY(SELECT DISTINCT a.authentication_method FROM auth.mfa_amr_claims a
        WHERE a.session_id=OLD.id ORDER BY a.authentication_method)
    ON CONFLICT(id) DO NOTHING;
    DELETE FROM public.auth_session_history
      WHERE user_id=OLD.user_id AND ended_at < statement_timestamp()-interval '90 days';
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION private.archive_ended_auth_session() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER archive_ended_auth_session BEFORE DELETE ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION private.archive_ended_auth_session();

CREATE FUNCTION public.get_my_session_activity()
RETURNS TABLE (
  id uuid,user_agent text,ip text,created_at timestamptz,last_refreshed_at timestamptz,
  authentication_methods text[],status text,ended_at timestamptz,is_current boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF NOT public.is_current_session_active() THEN
    RAISE EXCEPTION 'Session no longer active' USING ERRCODE='PT401';
  END IF;
  RETURN QUERY
  SELECT activity.* FROM (
    SELECT s.id,s.user_agent,host(s.ip),s.created_at,
      coalesce(s.refreshed_at AT TIME ZONE 'UTC',s.created_at),
      ARRAY(SELECT DISTINCT a.authentication_method FROM auth.mfa_amr_claims a
        WHERE a.session_id=s.id ORDER BY a.authentication_method),
      CASE WHEN private.session_has_access(s.id,v_user_id) THEN 'active' ELSE 'expired' END,
      NULL::timestamptz,coalesce(s.id::text=auth.jwt()->>'session_id',false)
    FROM auth.sessions s WHERE s.user_id=v_user_id
    UNION ALL
    SELECT h.id,h.user_agent,h.ip,h.created_at,h.last_refreshed_at,
      h.authentication_methods,'ended',h.ended_at,false
    FROM (SELECT history.* FROM public.auth_session_history history
      WHERE history.user_id=v_user_id AND history.ended_at >= statement_timestamp()-interval '90 days'
      ORDER BY history.ended_at DESC LIMIT 100) h
  ) activity
  ORDER BY 9 DESC,5 DESC NULLS LAST,1;
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_session_activity() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_session_activity() TO authenticated;

CREATE FUNCTION public.revoke_my_session(p_session_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_deleted uuid;
BEGIN
  IF NOT public.is_current_session_active() THEN
    RAISE EXCEPTION 'Session no longer active' USING ERRCODE='PT401';
  END IF;
  DELETE FROM auth.sessions s WHERE s.id=p_session_id AND s.user_id=auth.uid() RETURNING s.id INTO v_deleted;
  IF v_deleted IS NULL THEN
    RAISE EXCEPTION 'Session not found' USING ERRCODE='PT404';
  END IF;
  -- Auth's FK cascades also remove refresh credentials and AMR claims.
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_my_session(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_my_session(uuid) TO authenticated;

-- Logout revokes refresh credentials. Existing access JWTs retain the standard Supabase
-- lifetime; no global Data API hook or unrelated table policies are changed here.
