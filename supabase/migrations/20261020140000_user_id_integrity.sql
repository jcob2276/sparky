-- Referential integrity for per-user data (verified 2026-10-20: no orphan rows, no NULL user_id
-- outside the system tables audit_events / outbound_messages / vanguard_llm_usage, which are skipped).

-- 1. Missing FK to auth.users: deleting an account now cleans these tables.
ALTER TABLE public.daily_reconciliations   ADD CONSTRAINT daily_reconciliations_user_id_fkey   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.food_corrections        ADD CONSTRAINT food_corrections_user_id_fkey        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.food_favorites          ADD CONSTRAINT food_favorites_user_id_fkey          FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.food_parse_pending      ADD CONSTRAINT food_parse_pending_user_id_fkey      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.friction_events         ADD CONSTRAINT friction_events_user_id_fkey         FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.intervals_tokens        ADD CONSTRAINT intervals_tokens_user_id_fkey        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.vanguard_calendar_watch ADD CONSTRAINT vanguard_calendar_watch_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Indexes so those cascades (and RLS filters) do not seq-scan.
CREATE INDEX IF NOT EXISTS daily_reconciliations_user_id_idx   ON public.daily_reconciliations (user_id);
CREATE INDEX IF NOT EXISTS food_corrections_user_id_idx        ON public.food_corrections (user_id);
CREATE INDEX IF NOT EXISTS food_favorites_user_id_idx          ON public.food_favorites (user_id);
CREATE INDEX IF NOT EXISTS food_parse_pending_user_id_idx      ON public.food_parse_pending (user_id);
CREATE INDEX IF NOT EXISTS friction_events_user_id_idx         ON public.friction_events (user_id);
CREATE INDEX IF NOT EXISTS intervals_tokens_user_id_idx        ON public.intervals_tokens (user_id);
CREATE INDEX IF NOT EXISTS vanguard_calendar_watch_user_id_idx ON public.vanguard_calendar_watch (user_id);

-- 2. user_id NOT NULL: a NULL owner is invisible to RLS and can never be read back.
ALTER TABLE public.ai_chat_messages          ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.body_metrics              ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.daily_food_entries        ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.daily_nutrition           ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.daily_wins                ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.entities                  ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.exercise_logs             ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.habit_logs                ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.habits                    ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.life_goals                ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.location_history          ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.oura_daily_summary        ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.phone_usage_daily         ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.progress_photos           ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.vanguard_calendar         ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.vanguard_curiosity_queue  ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.vanguard_daily_aggregates ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.vanguard_feedback         ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.vanguard_footprint        ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.vanguard_knowledge        ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.vanguard_stream           ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.view_events               ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.weekly_reviews            ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.workout_sessions          ALTER COLUMN user_id SET NOT NULL;
