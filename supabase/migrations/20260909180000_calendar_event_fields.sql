-- Dodaje pola wydarzeń wcześniej zbierane w UI, ale nigdy nie zapisywane:
-- lokalizacja, flaga całodniowa oraz przypomnienie (minuty przed startem).

ALTER TABLE "public"."vanguard_calendar"
  ADD COLUMN IF NOT EXISTS "location" text,
  ADD COLUMN IF NOT EXISTS "is_all_day" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reminder_minutes" integer;
