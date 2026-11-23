-- Utwardzenie toru glosowek Telegrama (VPS) + naprawa regresji autoryzacji triggera.
--
-- 1. trigger_vanguard_telegram_worker: przywraca naglowek Authorization (klucz z _trigger_secrets).
--    Wersja wgrana recznie 2026-11-22 go gubila, przez co wiadomosci tekstowe i callbacki
--    dostawaly 401 z vanguard-telegram-worker. Glosowki dalej ida do kolejki pgmq (VPS)
--    i od razu dostaja worker_type='vps', zeby watchdog liczyl im 300 s, nie 90 s.
-- 2. vanguard_inbox_watchdog: jeden zbiorczy alert na cykl, uczciwy tekst, przycisk "Ponow"
--    (callback retry_inbox:<id>) tylko przy glosowkach. Stare rekordy (>15 min) zamyka po cichu.
-- Definicje zastepuja wersje wgrane recznie (nie sa zapisane w supabase_migrations).

CREATE OR REPLACE FUNCTION public.trigger_vanguard_telegram_worker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_key text;
BEGIN
  IF (NEW.payload->'message'->'voice') IS NOT NULL OR (NEW.payload->'message'->'audio') IS NOT NULL THEN
    UPDATE public.vanguard_telegram_inbox SET worker_type = 'vps' WHERE id = NEW.id;
    PERFORM pgmq.send('sparky_jobs', jsonb_build_object(
      'type', 'transcribe_telegram_voice',
      'payload', jsonb_build_object('inbox_id', NEW.id)
    ));
  ELSE
    SELECT secret INTO v_key FROM public._trigger_secrets WHERE name = 'service_role_key';
    PERFORM net.http_post(
      url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/vanguard-telegram-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(v_key, '')
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vanguard_inbox_watchdog()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rec record;
  v_count integer := 0;
  v_user_id uuid := '165ae341-670c-46ce-82dc-434c4dbfcdfd'::uuid;
  v_chat_id bigint;
  v_msg_id bigint;
  v_dur integer;
  v_is_voice boolean;
  v_buttons jsonb := '[]'::jsonb;
  v_text text;
BEGIN
  -- 1. Stare rekordy (>15 min): ciche zamkniecie, bez powiadomien.
  UPDATE public.vanguard_telegram_inbox
  SET status = 'timeout', updated_at = now(),
      error_log = coalesce(error_log, '') || E'\n[watchdog] silent timeout for older record'
  WHERE status = 'processing'
    AND created_at < now() - interval '15 minutes';

  -- 2. Swieze rekordy: edge > 90 s, vps > 300 s bez zmiany updated_at.
  FOR v_rec IN
    UPDATE public.vanguard_telegram_inbox
    SET status = 'timeout', updated_at = now(),
        error_log = coalesce(error_log, '') || E'\n[watchdog] processing timed out at ' || now()::text
    WHERE status = 'processing'
      AND created_at >= now() - interval '15 minutes'
      AND (
        (coalesce(worker_type, 'edge') = 'edge' AND updated_at < now() - interval '90 seconds')
        OR (worker_type = 'vps' AND updated_at < now() - interval '300 seconds')
      )
    RETURNING *
  LOOP
    v_count := v_count + 1;
    v_msg_id := (v_rec.payload->'message'->>'message_id')::bigint;
    v_dur := coalesce((v_rec.payload->'message'->'voice'->>'duration')::integer,
                      (v_rec.payload->'message'->'audio'->>'duration')::integer);
    v_is_voice := (v_rec.payload->'message'->'voice') IS NOT NULL
               OR (v_rec.payload->'message'->'audio') IS NOT NULL;
    IF v_chat_id IS NULL THEN
      v_chat_id := (v_rec.payload->'message'->'chat'->>'id')::bigint;
    END IF;

    INSERT INTO public.audit_events (user_id, event_type, severity, message, metadata)
    VALUES (
      v_user_id, 'voice_processing_timeout', 'error',
      'Wiadomosc w inbox przekroczyla limit czasu (watchdog)',
      jsonb_build_object(
        'inbox_id', v_rec.id,
        'worker_type', coalesce(v_rec.worker_type, 'edge'),
        'voice_duration_seconds', v_dur,
        'message_id', v_msg_id
      )
    );

    IF v_is_voice AND jsonb_array_length(v_buttons) < 5 THEN
      v_buttons := v_buttons || jsonb_build_array(jsonb_build_array(jsonb_build_object(
        'text', '🔄 Ponów' || CASE WHEN v_dur IS NOT NULL
          THEN format(' (%s:%s)', v_dur / 60, lpad((v_dur % 60)::text, 2, '0')) ELSE '' END,
        'callback_data', 'retry_inbox:' || v_rec.id::text
      )));
    END IF;
  END LOOP;

  -- 3. Jeden zbiorczy alert na cykl.
  IF v_count > 0 AND v_chat_id IS NOT NULL THEN
    v_text := CASE WHEN v_count = 1
      THEN '⚠️ Wiadomość nie została przetworzona w limicie czasu.'
      ELSE format('⚠️ %s wiadomości nie zostało przetworzonych w limicie czasu.', v_count) END;
    IF jsonb_array_length(v_buttons) > 0 THEN
      v_text := v_text || ' Możesz ponowić głosówkę przyciskiem poniżej.';
    END IF;

    INSERT INTO public.outbound_messages (user_id, chat_id, payload, status, priority)
    VALUES (
      v_user_id, v_chat_id,
      jsonb_build_object('method', 'sendMessage', 'body',
        jsonb_build_object('chat_id', v_chat_id, 'text', v_text)
        || CASE WHEN jsonb_array_length(v_buttons) > 0
             THEN jsonb_build_object('reply_markup', jsonb_build_object('inline_keyboard', v_buttons))
             ELSE '{}'::jsonb END),
      'pending', 10
    );
  END IF;

  RETURN v_count;
END;
$$;
