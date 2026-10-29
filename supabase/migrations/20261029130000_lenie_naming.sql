-- Lenie: jedna nazwa wszedzie. Komenda /walenie i klucz 'walenie' znikaja; zdarzenie zyje tylko w habit_logs (nawyk „Lenie”).
-- Widok analiz podaje je jako kategorie/etykiete 'lenie'; archiwum starej kopii dostaje spojna nazwe.
CREATE OR REPLACE VIEW public.vanguard_consolidated_activities WITH (security_invoker = true) AS
SELECT behavior_log.id, behavior_log.user_id, behavior_log.date AS event_date, 'behavior_log'::text AS source_type,
       behavior_log.behavior_key AS category, behavior_log.behavior_key AS label, behavior_log.value AS metric_value,
       behavior_log.note AS details,
       jsonb_build_object('behavior_key', behavior_log.behavior_key, 'value', behavior_log.value, 'note', behavior_log.note) AS metadata,
       behavior_log.created_at
FROM public.behavior_log
WHERE behavior_log.behavior_key NOT IN ('lenie', 'walenie')
UNION ALL
SELECT l.id, l.user_id, l.date AS event_date, 'behavior_log'::text AS source_type, 'lenie'::text AS category, 'lenie'::text AS label,
       1::numeric AS metric_value, l.context_note AS details,
       jsonb_build_object('behavior_key', 'lenie', 'value', 1, 'note', l.context_note) AS metadata, l.logged_at AS created_at
FROM public.habit_logs l
JOIN public.habits h ON h.id = l.habit_id AND h.name = 'Lenie'
WHERE l.completed IS TRUE
UNION ALL
SELECT workout_sessions.id, workout_sessions.user_id, workout_sessions.date AS event_date, 'workout_sessions'::text AS source_type,
       'workout'::text AS category, workout_sessions.workout_day AS label, workout_sessions.duration_minutes::numeric AS metric_value,
       workout_sessions.session_notes AS details,
       jsonb_build_object('workout_day', workout_sessions.workout_day, 'duration_minutes', workout_sessions.duration_minutes,
         'session_rpe', workout_sessions.session_rpe, 'hr_avg_bpm', workout_sessions.hr_avg_bpm, 'hr_peak_bpm', workout_sessions.hr_peak_bpm,
         'hr_strain_score', workout_sessions.hr_strain_score, 'hr_kcal_est', workout_sessions.hr_kcal_est) AS metadata,
       workout_sessions.created_at
FROM public.workout_sessions;
ALTER VIEW public.vanguard_consolidated_activities SET (security_invoker = true);

ALTER TABLE IF EXISTS archive.behavior_log_walenie RENAME TO behavior_log_lenie;
