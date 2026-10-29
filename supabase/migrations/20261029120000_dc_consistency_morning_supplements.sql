-- DC-01: submit_morning_plan upsertuje sloty zamiast kasowac plan. Ukonczenie zadan z Todo wynika ze stanu Todo; metadane przechodza tylko z ta sama tozsamoscia zadania.
-- DC-11: supplement_logs.logged_at may be null when day is known but clock time is unknown.

CREATE UNIQUE INDEX IF NOT EXISTS daily_win_tasks_day_win_slot_uidx
  ON public.daily_win_tasks (day_win_id, slot);

-- DC-02: wybrany KPI zyje przy zadaniu, wiec PowerList, Todo i cofniecie licza zawsze ten sam licznik.
ALTER TABLE public.daily_win_tasks
  ADD COLUMN IF NOT EXISTS kpi_id uuid REFERENCES public.goal_kpis(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.submit_morning_plan(
  p_user_id uuid,
  p_date date,
  p_slots jsonb DEFAULT '[]'::jsonb,
  p_schedules jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_win_id uuid;
  r jsonb;
  v_slot integer;
  v_todo_id uuid;
  v_title text;
  v_keep_slots integer[] := ARRAY[]::integer[];
  v_prev_all jsonb;
  v_prev jsonb;
  v_todo_status text;
  v_todo_completed timestamptz;
  v_done boolean;
  v_completed timestamptz;
BEGIN
  IF p_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'submit_morning_plan: forbidden';
  END IF;

  INSERT INTO public.daily_wins (user_id, date, result)
  VALUES (p_user_id, p_date, NULL)
  ON CONFLICT (user_id, date) DO NOTHING;

  SELECT id INTO v_win_id
  FROM public.daily_wins
  WHERE user_id = p_user_id AND date = p_date;

  IF v_win_id IS NULL THEN
    RAISE EXCEPTION 'submit_morning_plan: daily_wins row missing';
  END IF;

  -- Stan planu sprzed zmiany: tozsamosc zadania (todo_id albo tytul wolnego zadania) przechodzi miedzy slotami.
  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_prev_all
  FROM public.daily_win_tasks t
  WHERE t.day_win_id = v_win_id AND t.user_id = p_user_id;

  FOR r IN SELECT value FROM jsonb_array_elements(COALESCE(p_slots, '[]'::jsonb))
  LOOP
    v_slot := (r->>'slot')::integer;
    v_todo_id := NULLIF(r->>'todo_id', '')::uuid;
    v_title := r->>'title';
    v_keep_slots := array_append(v_keep_slots, v_slot);

    SELECT e INTO v_prev
    FROM jsonb_array_elements(v_prev_all) AS e
    WHERE (v_todo_id IS NOT NULL AND (e->>'todo_id')::uuid = v_todo_id)
       OR (v_todo_id IS NULL AND e->>'todo_id' IS NULL AND e->>'title' IS NOT DISTINCT FROM v_title)
    ORDER BY ((e->>'slot')::integer = v_slot) DESC
    LIMIT 1;

    IF v_todo_id IS NOT NULL THEN
      -- Todo jest zrodlem prawdy o ukonczeniu: plan nigdy go nie cofa ani nie wymusza (trigger widzi zgodne wartosci).
      SELECT status, completed_at INTO v_todo_status, v_todo_completed
      FROM public.todo_items
      WHERE id = v_todo_id AND user_id = p_user_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'submit_morning_plan: todo not found';
      END IF;
      v_done := v_todo_status = 'done';
      v_completed := CASE WHEN v_done THEN COALESCE(v_todo_completed, now()) ELSE NULL END;
    ELSE
      v_done := COALESCE((v_prev->>'done')::boolean, false);
      v_completed := CASE WHEN v_done THEN (v_prev->>'completed_at')::timestamptz ELSE NULL END;
    END IF;

    INSERT INTO public.daily_win_tasks (
      day_win_id, user_id, slot, title, category, todo_id, done, completed_at,
      project_id, checkpoint_id, pin_id, target_value, time_slot, kpi_id
    ) VALUES (
      v_win_id, p_user_id, v_slot, v_title,
      COALESCE(NULLIF(r->>'category', ''), 'general'),
      v_todo_id, v_done, v_completed,
      -- metadane (projekt/KPI/kamien milowy) tylko przy tej samej tozsamosci; nowe zadanie startuje czyste
      (v_prev->>'project_id')::uuid, (v_prev->>'checkpoint_id')::uuid, (v_prev->>'pin_id')::uuid,
      v_prev->>'target_value', v_prev->>'time_slot', (v_prev->>'kpi_id')::uuid
    )
    ON CONFLICT (day_win_id, slot) DO UPDATE SET
      title = EXCLUDED.title,
      category = EXCLUDED.category,
      todo_id = EXCLUDED.todo_id,
      done = EXCLUDED.done,
      completed_at = EXCLUDED.completed_at,
      project_id = EXCLUDED.project_id,
      checkpoint_id = EXCLUDED.checkpoint_id,
      pin_id = EXCLUDED.pin_id,
      target_value = EXCLUDED.target_value,
      time_slot = EXCLUDED.time_slot,
      kpi_id = EXCLUDED.kpi_id;
  END LOOP;

  IF cardinality(v_keep_slots) > 0 THEN
    DELETE FROM public.daily_win_tasks
    WHERE day_win_id = v_win_id
      AND NOT (slot = ANY (v_keep_slots));
  ELSE
    DELETE FROM public.daily_win_tasks WHERE day_win_id = v_win_id;
  END IF;

  FOR r IN SELECT value FROM jsonb_array_elements(COALESCE(p_schedules, '[]'::jsonb))
  LOOP
    UPDATE public.todo_items
    SET
      scheduled_time = NULLIF(r->>'scheduled_time', '')::timestamptz,
      duration_minutes = NULLIF(r->>'duration_minutes', '')::integer,
      due_date = p_date
    WHERE id = (r->>'todo_id')::uuid
      AND user_id = p_user_id;
  END LOOP;

  RETURN v_win_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_morning_plan(uuid, date, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_morning_plan(uuid, date, jsonb, jsonb) TO authenticated;

ALTER TABLE public.supplement_logs
  ALTER COLUMN logged_at DROP NOT NULL;

COMMENT ON COLUMN public.supplement_logs.logged_at IS
  'Event clock time when known; NULL = day known (date) but time unknown (historical checkbox).';
