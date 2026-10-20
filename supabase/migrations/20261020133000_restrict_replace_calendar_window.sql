-- replace_calendar_window is SECURITY DEFINER, takes an arbitrary p_user_id and does not
-- compare it with auth.uid(); its only caller is the sync edge function (service role).
-- Browser roles must not be able to rewrite another user's calendar window.
REVOKE EXECUTE ON FUNCTION public.replace_calendar_window(uuid, text, timestamptz, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_calendar_window(uuid, text, timestamptz, timestamptz, jsonb) TO service_role;
