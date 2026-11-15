-- Jeden odczyt zamiast ~9 osobnych zapytań REST co minutę w vanguard-push-reminder.
-- Cel: mniej wpisów w logach API Supabase (limit Log Ingestion w planie Free). Zakres danych bez zmian.
-- Tylko odczyt; dostęp wyłącznie dla service_role (funkcja brzegowa działa z kluczem serwisowym).
CREATE OR REPLACE FUNCTION public.push_reminder_snapshot(
  p_now timestamptz,
  p_today_start timestamptz,
  p_meeting_from timestamptz,
  p_meeting_to timestamptz,
  p_sweep_before timestamptz
) RETURNS jsonb
  LANGUAGE sql
  STABLE
  SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'subscriptions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', s.user_id, 'endpoint', s.endpoint, 'keys_p256dh', s.keys_p256dh, 'keys_auth', s.keys_auth))
      FROM public.push_subscriptions s), '[]'::jsonb),
    'fcm_tokens', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('user_id', f.user_id, 'token', f.token))
      FROM public.push_fcm_tokens f), '[]'::jsonb),
    'due_todos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', t.id, 'user_id', t.user_id, 'title', t.title))
      FROM (SELECT id, user_id, title FROM public.todo_items
            WHERE reminder_at <= p_now AND reminder_sent = false AND status <> 'done'
            LIMIT 50) t), '[]'::jsonb),
    'supplements', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', u.id, 'user_id', u.user_id, 'name', u.name, 'emoji', u.emoji, 'reminder_time', u.reminder_time,
        'start_date', u.start_date, 'end_date', u.end_date, 'reminder_sent_date', u.reminder_sent_date))
      FROM public.supplements u WHERE u.active = true AND u.reminder_time IS NOT NULL), '[]'::jsonb),
    'obligations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id, 'user_id', o.user_id, 'title', o.title, 'kind', o.kind, 'related_name', o.related_name,
        'anchor_date', o.anchor_date, 'recurrence', o.recurrence, 'lead_offsets', o.lead_offsets,
        'sent_reminders', o.sent_reminders))
      FROM (SELECT * FROM public.life_obligations WHERE is_active = true LIMIT 200) o), '[]'::jsonb),
    'recent_ambient', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('send_after', r.send_after))
      FROM (SELECT send_after FROM public.outbound_messages
            WHERE send_after >= p_today_start AND dedupe_key IS NOT NULL
            ORDER BY send_after DESC LIMIT 5) r), '[]'::jsonb),
    'upcoming_events', COALESCE((
      SELECT jsonb_agg(to_jsonb(e))
      FROM (SELECT id, user_id, summary, start_time, end_time, category FROM public.vanguard_calendar
            WHERE start_time >= p_meeting_from AND start_time <= p_meeting_to
            ORDER BY start_time ASC LIMIT 5) e), '[]'::jsonb),
    'due_outbound', COALESCE((
      SELECT jsonb_agg(to_jsonb(m))
      FROM (SELECT * FROM public.outbound_messages
            WHERE status = 'pending' AND send_after <= p_sweep_before
            ORDER BY priority DESC, send_after ASC LIMIT 10) m), '[]'::jsonb)
  );
$function$;

REVOKE ALL ON FUNCTION public.push_reminder_snapshot(timestamptz, timestamptz, timestamptz, timestamptz, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_reminder_snapshot(timestamptz, timestamptz, timestamptz, timestamptz, timestamptz)
  TO service_role;
