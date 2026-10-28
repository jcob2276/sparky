-- Martwe pozycje z importu Yazio w food_library: kopia do archive, potem usunięcie.
-- Kryterium (zweryfikowane 2026-10-28): source = 'yazio_import', brak wpisu w daily_food_entries o tej nazwie
-- i brak pozycji o tej nazwie w food_favorites. Dotyczy 12 pozycji (205 z 218 importów jest w użyciu).
-- Ulubione (food_favorites) zostają: część jest przypięta lub używana (ostatnio 2026-10-24).
-- Cofnięcie: INSERT INTO public.food_library SELECT * FROM archive.food_library_yazio_unused;

CREATE SCHEMA IF NOT EXISTS archive;
CREATE TABLE IF NOT EXISTS archive.food_library_yazio_unused AS
SELECT l.* FROM public.food_library l
 WHERE l.source = 'yazio_import'
   AND NOT EXISTS (SELECT 1 FROM public.daily_food_entries e WHERE e.user_id = l.user_id AND lower(e.name) = lower(l.name))
   AND NOT EXISTS (SELECT 1 FROM public.food_favorites f WHERE f.user_id = l.user_id AND lower(f.name) = lower(l.name));
REVOKE ALL ON ALL TABLES IN SCHEMA archive FROM PUBLIC, anon, authenticated;

DELETE FROM public.food_library l
 WHERE l.id IN (SELECT id FROM archive.food_library_yazio_unused);
