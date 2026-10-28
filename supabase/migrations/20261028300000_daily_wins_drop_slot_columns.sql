-- Sloty dnia zyja tylko w daily_win_tasks. Usuwamy 50 kolumn slotow z daily_wins oraz oba triggery synchronizujace.
-- Najpierw kopia danych w archive (odwracalnosc), potem drop. Frontend i funkcje czytaja juz daily_win_tasks (wdrozone).
CREATE TABLE IF NOT EXISTS archive.daily_wins_slots AS
SELECT id, user_id, date, category_1,category_2,category_3,category_4,category_5,completed_at_1,completed_at_2,completed_at_3,completed_at_4,completed_at_5,done_1,done_2,done_3,done_4,done_5,task_1,task_1_checkpoint_id,task_1_pin_id,task_1_project_id,task_1_target_value,task_1_time_slot,task_1_todo_id,task_2,task_2_checkpoint_id,task_2_pin_id,task_2_project_id,task_2_target_value,task_2_time_slot,task_2_todo_id,task_3,task_3_checkpoint_id,task_3_pin_id,task_3_project_id,task_3_target_value,task_3_time_slot,task_3_todo_id,task_4,task_4_checkpoint_id,task_4_pin_id,task_4_project_id,task_4_target_value,task_4_time_slot,task_4_todo_id,task_5,task_5_checkpoint_id,task_5_pin_id,task_5_project_id,task_5_target_value,task_5_time_slot,task_5_todo_id
FROM public.daily_wins;
COMMENT ON TABLE archive.daily_wins_slots IS 'Kopia kolumn slotow daily_wins sprzed usuniecia (2026-10-28). Zrodlem prawdy jest daily_win_tasks.';
REVOKE ALL ON archive.daily_wins_slots FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_daily_wins ON public.daily_wins;
DROP TRIGGER IF EXISTS trg_sync_daily_win_tasks ON public.daily_win_tasks;
DROP FUNCTION IF EXISTS public.sync_daily_wins_to_daily_win_tasks();
DROP FUNCTION IF EXISTS public.sync_daily_win_tasks_to_daily_wins();

ALTER TABLE public.daily_wins
  DROP COLUMN IF EXISTS category_1,
  DROP COLUMN IF EXISTS category_2,
  DROP COLUMN IF EXISTS category_3,
  DROP COLUMN IF EXISTS category_4,
  DROP COLUMN IF EXISTS category_5,
  DROP COLUMN IF EXISTS completed_at_1,
  DROP COLUMN IF EXISTS completed_at_2,
  DROP COLUMN IF EXISTS completed_at_3,
  DROP COLUMN IF EXISTS completed_at_4,
  DROP COLUMN IF EXISTS completed_at_5,
  DROP COLUMN IF EXISTS done_1,
  DROP COLUMN IF EXISTS done_2,
  DROP COLUMN IF EXISTS done_3,
  DROP COLUMN IF EXISTS done_4,
  DROP COLUMN IF EXISTS done_5,
  DROP COLUMN IF EXISTS task_1,
  DROP COLUMN IF EXISTS task_1_checkpoint_id,
  DROP COLUMN IF EXISTS task_1_pin_id,
  DROP COLUMN IF EXISTS task_1_project_id,
  DROP COLUMN IF EXISTS task_1_target_value,
  DROP COLUMN IF EXISTS task_1_time_slot,
  DROP COLUMN IF EXISTS task_1_todo_id,
  DROP COLUMN IF EXISTS task_2,
  DROP COLUMN IF EXISTS task_2_checkpoint_id,
  DROP COLUMN IF EXISTS task_2_pin_id,
  DROP COLUMN IF EXISTS task_2_project_id,
  DROP COLUMN IF EXISTS task_2_target_value,
  DROP COLUMN IF EXISTS task_2_time_slot,
  DROP COLUMN IF EXISTS task_2_todo_id,
  DROP COLUMN IF EXISTS task_3,
  DROP COLUMN IF EXISTS task_3_checkpoint_id,
  DROP COLUMN IF EXISTS task_3_pin_id,
  DROP COLUMN IF EXISTS task_3_project_id,
  DROP COLUMN IF EXISTS task_3_target_value,
  DROP COLUMN IF EXISTS task_3_time_slot,
  DROP COLUMN IF EXISTS task_3_todo_id,
  DROP COLUMN IF EXISTS task_4,
  DROP COLUMN IF EXISTS task_4_checkpoint_id,
  DROP COLUMN IF EXISTS task_4_pin_id,
  DROP COLUMN IF EXISTS task_4_project_id,
  DROP COLUMN IF EXISTS task_4_target_value,
  DROP COLUMN IF EXISTS task_4_time_slot,
  DROP COLUMN IF EXISTS task_4_todo_id,
  DROP COLUMN IF EXISTS task_5,
  DROP COLUMN IF EXISTS task_5_checkpoint_id,
  DROP COLUMN IF EXISTS task_5_pin_id,
  DROP COLUMN IF EXISTS task_5_project_id,
  DROP COLUMN IF EXISTS task_5_target_value,
  DROP COLUMN IF EXISTS task_5_time_slot,
  DROP COLUMN IF EXISTS task_5_todo_id;
