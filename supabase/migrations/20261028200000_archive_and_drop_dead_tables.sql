-- Martwe tabele: kopia do schematu archive, potem usunięcie z public.
-- Zweryfikowane 2026-10-28: brak kluczy obcych (dzieci), widoków, triggerów, zadań cron, odwołań w funkcjach SQL i w kodzie
-- (src, funkcje brzegowe, pakiety, skrypty poza aw-bridge).
--   companies, vw_consensus, us_report_import_coverage : pozostałości po usuniętym module Inwestycje (migracja 20261027193529).
--   vanguard_footprint : dziennik mostu ActivityWatch v2, ostatni wpis 2026-05-14; bieżące dane trafiają do aw_daily_summary.
--   food_parse_pending : pusta kolejka bez konsumenta.
-- Zostaje food_history_repairs (kopia zapasowa napraw historii jedzenia, używana przez skrypt naprawczy).
--
-- Schemat archive nie jest wystawiony w API (PostgREST wystawia public) i nie ma uprawnień dla anon/authenticated.
-- Cofnięcie: CREATE TABLE public.<nazwa> (LIKE archive.<nazwa>); INSERT INTO public.<nazwa> SELECT * FROM archive.<nazwa>;
--            (indeksy, RLS i polityki trzeba odtworzyć z migracji źródłowych).

CREATE SCHEMA IF NOT EXISTS archive;
REVOKE ALL ON SCHEMA archive FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS archive.companies AS TABLE public.companies;
CREATE TABLE IF NOT EXISTS archive.vw_consensus AS TABLE public.vw_consensus;
CREATE TABLE IF NOT EXISTS archive.us_report_import_coverage AS TABLE public.us_report_import_coverage;
CREATE TABLE IF NOT EXISTS archive.vanguard_footprint AS TABLE public.vanguard_footprint;
CREATE TABLE IF NOT EXISTS archive.food_parse_pending AS TABLE public.food_parse_pending;

REVOKE ALL ON ALL TABLES IN SCHEMA archive FROM PUBLIC, anon, authenticated;

DROP TABLE public.companies;
DROP TABLE public.vw_consensus;
DROP TABLE public.us_report_import_coverage;
DROP TABLE public.vanguard_footprint;
DROP TABLE public.food_parse_pending;
