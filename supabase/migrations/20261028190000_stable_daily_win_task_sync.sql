-- Trigger daily_wins -> daily_win_tasks: aktualizacja slot po slocie zamiast kasowania wszystkich zadań.
--
-- Stwierdzone 2026-10-28 na produkcji (test w transakcji z rollbackiem): nawet UPDATE daily_wins SET result = result
-- kasował i tworzył od nowa wszystkie 5 zadań dnia z nowymi identyfikatorami (DELETE + INSERT w każdym wywołaniu).
-- Zmiana dowolnego pola nagłówka (wynik, dziennik, nastrój) zrywała więc referencje do zadań i nadpisywała
-- równoległe zmiany. Teraz: pusty slot -> usuń wiersz slotu, istniejący -> UPDATE tylko gdy wartości się różnią,
-- brakujący -> INSERT. Identyfikatory i created_at zadań są stabilne.
--
-- Zachowane: SECURITY INVOKER, pusty search_path, strażnik pg_trigger_depth() > 1 (brak pętli z triggerem w drugą stronę).
-- Usunięty: ostatni fallback „pierwszy użytkownik z auth.users” (daily_wins.user_id jest NOT NULL).
-- Cofnięcie: przywrócić definicję z supabase/migrations/20260504000000_baseline.sql (ze SET search_path = '').

CREATE OR REPLACE FUNCTION public.sync_daily_wins_to_daily_win_tasks()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  j jsonb := to_jsonb(NEW);
  v_user_id uuid := COALESCE(NEW.user_id, auth.uid());
  i integer;
  v_title text;
  v_done boolean;
  v_category text;
  v_completed_at timestamptz;
  v_todo_id uuid;
  v_checkpoint_id uuid;
  v_pin_id uuid;
  v_project_id uuid;
  v_target_value text;
  v_time_slot text;
BEGIN
  IF pg_trigger_depth() > 1 OR v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR i IN 1..5 LOOP
    v_title := j ->> ('task_' || i);

    IF v_title IS NULL OR v_title = '' THEN
      DELETE FROM public.daily_win_tasks WHERE day_win_id = NEW.id AND slot = i;
      CONTINUE;
    END IF;

    v_done := COALESCE((j ->> ('done_' || i))::boolean, false);
    v_category := j ->> ('category_' || i);
    v_completed_at := (j ->> ('completed_at_' || i))::timestamptz;
    v_todo_id := (j ->> ('task_' || i || '_todo_id'))::uuid;
    v_checkpoint_id := (j ->> ('task_' || i || '_checkpoint_id'))::uuid;
    v_pin_id := (j ->> ('task_' || i || '_pin_id'))::uuid;
    v_project_id := (j ->> ('task_' || i || '_project_id'))::uuid;
    v_target_value := j ->> ('task_' || i || '_target_value');
    v_time_slot := j ->> ('task_' || i || '_time_slot');

    IF EXISTS (SELECT 1 FROM public.daily_win_tasks WHERE day_win_id = NEW.id AND slot = i) THEN
      UPDATE public.daily_win_tasks
         SET title = v_title, done = v_done, category = v_category, completed_at = v_completed_at,
             todo_id = v_todo_id, checkpoint_id = v_checkpoint_id, pin_id = v_pin_id,
             project_id = v_project_id, target_value = v_target_value, time_slot = v_time_slot
       WHERE day_win_id = NEW.id AND slot = i
         AND (title, done, category, completed_at, todo_id, checkpoint_id, pin_id, project_id, target_value, time_slot)
             IS DISTINCT FROM
             (v_title, v_done, v_category, v_completed_at, v_todo_id, v_checkpoint_id, v_pin_id, v_project_id, v_target_value, v_time_slot);
    ELSE
      INSERT INTO public.daily_win_tasks
        (day_win_id, slot, user_id, title, done, category, completed_at, todo_id, checkpoint_id, pin_id, project_id, target_value, time_slot)
      VALUES
        (NEW.id, i, v_user_id, v_title, v_done, v_category, v_completed_at, v_todo_id, v_checkpoint_id, v_pin_id, v_project_id, v_target_value, v_time_slot);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
