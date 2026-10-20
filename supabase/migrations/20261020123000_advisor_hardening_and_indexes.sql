-- Supabase advisor follow-ups (2026-10-20): hardening + cheap performance wins.

-- Identical duplicate index on training_plan_workouts (neither backs a constraint).
DROP INDEX IF EXISTS public.plan_workouts_active_date;

-- Pin search_path on SECURITY DEFINER / trigger functions flagged as mutable.
ALTER FUNCTION public.get_desktop_dashboard_data(uuid) SET search_path = public;
ALTER FUNCTION public.trg_sync_strava_activity_to_calendar() SET search_path = public;

-- Trigger-only function must not be callable through /rest/v1/rpc.
REVOKE EXECUTE ON FUNCTION public.create_next_recurring_todo() FROM PUBLIC, anon, authenticated;

-- Covering indexes for foreign keys flagged by the performance advisor.
CREATE INDEX IF NOT EXISTS audit_events_user_id_idx ON public.audit_events (user_id);
CREATE INDEX IF NOT EXISTS finance_bills_user_id_idx ON public.finance_bills (user_id);
CREATE INDEX IF NOT EXISTS finance_income_sources_user_id_idx ON public.finance_income_sources (user_id);
CREATE INDEX IF NOT EXISTS finance_subscriptions_user_id_idx ON public.finance_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS finance_wishlist_user_id_idx ON public.finance_wishlist (user_id);
CREATE INDEX IF NOT EXISTS health_coach_jobs_result_version_id_idx ON public.health_coach_jobs (result_version_id);
CREATE INDEX IF NOT EXISTS note_attachments_user_id_idx ON public.note_attachments (user_id);
CREATE INDEX IF NOT EXISTS note_folders_parent_id_idx ON public.note_folders (parent_id);
CREATE INDEX IF NOT EXISTS nutrition_meal_memories_source_capture_id_idx ON public.nutrition_meal_memories (source_capture_id);
CREATE INDEX IF NOT EXISTS training_plan_versions_previous_version_id_idx ON public.training_plan_versions (previous_version_id);
CREATE INDEX IF NOT EXISTS training_plan_workouts_workout_session_id_idx ON public.training_plan_workouts (workout_session_id);
CREATE INDEX IF NOT EXISTS vanguard_entity_links_superseded_by_idx ON public.vanguard_entity_links (superseded_by);
CREATE INDEX IF NOT EXISTS vanguard_notes_folder_id_idx ON public.vanguard_notes (folder_id);
