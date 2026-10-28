-- CREATE OR REPLACE VIEW (20261028240000) zdjął z vanguard_consolidated_activities opcję security_invoker,
-- przez co widok działałby z uprawnieniami właściciela i omijał RLS tabel bazowych (behavior_log, habit_logs, workout_sessions).
-- Wykryte przez db:check-invariants zaraz po zmianie. Przywrócone.
-- Zasada na przyszłość: przy CREATE OR REPLACE VIEW zawsze WITH (security_invoker = true) albo ALTER VIEW ... SET po zmianie.
--
-- Cofnięcie: nie dotyczy (stan zepsuty).

ALTER VIEW public.vanguard_consolidated_activities SET (security_invoker = true);
