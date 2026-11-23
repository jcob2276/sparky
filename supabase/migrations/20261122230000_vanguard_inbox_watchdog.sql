-- 20261122230000_vanguard_inbox_watchdog.sql
-- Watchdog (Dead Man's Switch) dla zawieszonych zadan w vanguard_telegram_inbox

-- 1. Dodaj kolumne worker_type ('edge' vs 'vps')
ALTER TABLE public.vanguard_telegram_inbox
  ADD COLUMN IF NOT EXISTS worker_type text DEFAULT 'edge';

-- 2. Funkcja watchdoga
CREATE OR REPLACE FUNCTION public.vanguard_inbox_watchdog()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rec record;
  v_count integer := 0;
  v_vanguard_user_id uuid := '165ae341-670c-46ce-82dc-434c4dbfcdfd'::uuid;
  v_chat_id bigint;
  v_voice_dur integer;
  v_alert_text text;
BEGIN
  -- Atomowo zmien status rekordow wiszacych w 'processing':
  -- dla 'edge': powyzej 90 sekund
  -- dla 'vps': powyzej 300 sekund
  FOR v_rec IN
    UPDATE public.vanguard_telegram_inbox
    SET 
      status = 'timeout',
      updated_at = now(),
      error_log = coalesce(error_log, '') || E'\n[watchdog] processing timed out by dead man switch at ' || now()::text
    WHERE status = 'processing'
      AND (
        (coalesce(worker_type, 'edge') = 'edge' AND updated_at < now() - interval '90 seconds')
        OR
        (worker_type = 'vps' AND updated_at < now() - interval '300 seconds')
      )
    RETURNING *
  LOOP
    v_count := v_count + 1;

    v_chat_id := (v_rec.payload->'message'->'chat'->>'id')::bigint;
    v_voice_dur := (v_rec.payload->'message'->'voice'->>'duration')::integer;

    -- Zapisz zdarzenie w audit_events
    INSERT INTO public.audit_events (
      user_id,
      event_type,
      severity,
      message,
      metadata
    ) VALUES (
      v_vanguard_user_id,
      'voice_processing_timeout',
      'error',
      'Wykryto przekroczenie limitu czasu przetwarzania wiadomosci w inbox (Dead Man Switch)',
      jsonb_build_object(
        'inbox_id', v_rec.id,
        'worker_type', coalesce(v_rec.worker_type, 'edge'),
        'voice_duration_seconds', v_voice_dur,
        'message_id', v_rec.payload->'message'->>'message_id'
      )
    );

    -- Jesli znany jest chat_id, wyslij powiadomienie z opcja ponowienia
    IF v_chat_id IS NOT NULL THEN
      IF v_voice_dur IS NOT NULL THEN
        v_alert_text := format('⚠️ Przetwarzanie Twojej głosówki (%s min %s s) przekroczyło limit czasu. Została zabezpieczona w systemie do ponowienia.',
          (v_voice_dur / 60)::text, lpad((v_voice_dur % 60)::text, 2, '0'));
      ELSE
        v_alert_text := '⚠️ Przetwarzanie wiadomości przekroczyło limit czasu. Została zabezpieczona w systemie.';
      END IF;

      INSERT INTO public.outbound_messages (
        user_id,
        chat_id,
        payload,
        status,
        priority
      ) VALUES (
        v_vanguard_user_id,
        v_chat_id,
        jsonb_build_object(
          'method', 'sendMessage',
          'body', jsonb_build_object(
            'chat_id', v_chat_id,
            'text', v_alert_text,
            'reply_to_message_id', (v_rec.payload->'message'->>'message_id')::bigint,
            'reply_markup', jsonb_build_object(
              'inline_keyboard', jsonb_build_array(
                jsonb_build_array(
                  jsonb_build_object('text', '🔄 Ponów na VPS', 'callback_data', 'retry_inbox:' || v_rec.id::text)
                )
              )
            )
          )
        ),
        'pending',
        10
      );
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 3. Zarejestruj w pg_cron co 2 minuty
SELECT cron.unschedule('vanguard-inbox-watchdog') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'vanguard-inbox-watchdog');
SELECT cron.schedule('vanguard-inbox-watchdog', '*/2 * * * *', 'SELECT public.vanguard_inbox_watchdog()');
