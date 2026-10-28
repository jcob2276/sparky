-- Lenie / walenie, etap 3: koniec kopii. Jedyne źródło to habit_logs (nawyk „Lenie”).
-- Czytelnicy przepięci (widok vanguard_consolidated_activities, compute-behavior-effects), zapis z Telegramu idzie do habit_logs.
-- Kopia behavior_log.walenie (89 wierszy, w tym 9 starych z notatkami) trafia do archive i jest usuwana razem z triggerem.
--
-- Cofnięcie: INSERT INTO public.behavior_log (user_id, date, behavior_key, value, note, created_at)
--              SELECT user_id, date, behavior_key, value, note, created_at FROM archive.behavior_log_walenie;
--            oraz odtworzyć trigger z migracji 20261028150000_lenie_behavior_projection.sql.

DROP TRIGGER IF EXISTS habit_logs_sync_lenie ON public.habit_logs;
DROP FUNCTION IF EXISTS public.sync_lenie_behavior_log();

CREATE SCHEMA IF NOT EXISTS archive;
CREATE TABLE IF NOT EXISTS archive.behavior_log_walenie AS
SELECT * FROM public.behavior_log WHERE behavior_key = 'walenie';
REVOKE ALL ON ALL TABLES IN SCHEMA archive FROM PUBLIC, anon, authenticated;

DELETE FROM public.behavior_log WHERE behavior_key = 'walenie';
