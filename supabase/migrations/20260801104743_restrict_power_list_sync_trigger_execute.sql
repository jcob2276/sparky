-- Trigger functions are attached by the migration owner and are not public RPCs.
-- Runtime trigger execution does not require authenticated users to call them.
REVOKE ALL ON FUNCTION public.sync_daily_win_tasks_to_todo() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_todo_to_daily_win_tasks() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sync_daily_win_tasks_to_todo() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_todo_to_daily_win_tasks() TO service_role;
