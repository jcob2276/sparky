-- Power List is a daily snapshot. A linked Todo shares completion state, but
-- neither side may rewrite the other's title, placement or due date.

CREATE OR REPLACE FUNCTION public.sync_daily_win_tasks_to_todo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF pg_trigger_depth() > 1 OR NEW.todo_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.done IS NOT DISTINCT FROM OLD.done
     AND NEW.completed_at IS NOT DISTINCT FROM OLD.completed_at THEN
    RETURN NEW;
  END IF;

  UPDATE public.todo_items
  SET status = CASE WHEN NEW.done THEN 'done' ELSE 'open' END,
      completed_at = CASE WHEN NEW.done THEN COALESCE(NEW.completed_at, now()) ELSE NULL END
  WHERE id = NEW.todo_id
    AND user_id = NEW.user_id
    AND (
      status IS DISTINCT FROM (CASE WHEN NEW.done THEN 'done' ELSE 'open' END)
      OR completed_at IS DISTINCT FROM (
        CASE WHEN NEW.done THEN COALESCE(NEW.completed_at, now()) ELSE NULL END
      )
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_daily_win_tasks_to_todo ON public.daily_win_tasks;
CREATE TRIGGER trg_sync_daily_win_tasks_to_todo
AFTER UPDATE OF done, completed_at ON public.daily_win_tasks
FOR EACH ROW
EXECUTE FUNCTION public.sync_daily_win_tasks_to_todo();

REVOKE ALL ON FUNCTION public.sync_daily_win_tasks_to_todo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_daily_win_tasks_to_todo() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_todo_to_daily_win_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.completed_at IS NOT DISTINCT FROM OLD.completed_at THEN
    RETURN NEW;
  END IF;

  UPDATE public.daily_win_tasks AS task
  SET done = NEW.status = 'done',
      completed_at = CASE WHEN NEW.status = 'done' THEN COALESCE(NEW.completed_at, now()) ELSE NULL END
  FROM public.daily_wins AS win
  WHERE task.day_win_id = win.id
    AND task.todo_id = NEW.id
    AND task.user_id = NEW.user_id
    AND win.user_id = NEW.user_id
    AND win.date = (timezone('Europe/Warsaw', now()))::date
    AND (
      task.done IS DISTINCT FROM (NEW.status = 'done')
      OR task.completed_at IS DISTINCT FROM (
        CASE WHEN NEW.status = 'done' THEN COALESCE(NEW.completed_at, now()) ELSE NULL END
      )
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_todo_to_daily_win_tasks ON public.todo_items;
CREATE TRIGGER trg_sync_todo_to_daily_win_tasks
AFTER UPDATE OF status, completed_at ON public.todo_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_todo_to_daily_win_tasks();

REVOKE ALL ON FUNCTION public.sync_todo_to_daily_win_tasks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_todo_to_daily_win_tasks() TO authenticated, service_role;
