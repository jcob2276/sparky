-- Lenie / walenie: jedno źródło prawdy to habit_logs (nawyk „Lenie”).
--
-- Do tej pory ten sam fakt zapisywały dwie ścieżki: aplikacja i /lenie → habit_logs, a /walenie|/pmo
-- → behavior_log (klucz 'walenie'). Panel Lenie widział tylko pierwszą historię, analizy
-- (compute-behavior-effects, korelacje) tylko drugą (9 dni wobec 89).
--
-- Po tej migracji zapisuje wyłącznie habit_logs, a behavior_log.walenie jest kopią pochodną
-- utrzymywaną triggerem, więc istniejący czytelnicy dostają pełną historię i nie mogą się rozjechać.
-- Docelowo czytelnicy przejdą na habit_logs i kopia zniknie (zob. docs/SINGLE_SOURCE.md).
--
-- Cofnięcie: DROP TRIGGER habit_logs_sync_lenie ON public.habit_logs;
--            DROP FUNCTION public.sync_lenie_behavior_log();

CREATE OR REPLACE FUNCTION public.sync_lenie_behavior_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.habit_logs%ROWTYPE;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

  IF NOT EXISTS (SELECT 1 FROM public.habits h WHERE h.id = v_row.habit_id AND h.name = 'Lenie') THEN
    RETURN NULL;
  END IF;

  -- Zmiana daty wpisu: usuń kopię ze starej daty.
  IF TG_OP = 'UPDATE' AND OLD.date IS DISTINCT FROM NEW.date THEN
    DELETE FROM public.behavior_log
     WHERE user_id = OLD.user_id AND date = OLD.date AND behavior_key = 'walenie';
  END IF;

  IF TG_OP = 'DELETE' OR v_row.completed IS NOT TRUE THEN
    DELETE FROM public.behavior_log
     WHERE user_id = v_row.user_id AND date = v_row.date AND behavior_key = 'walenie';
  ELSE
    INSERT INTO public.behavior_log (user_id, date, behavior_key, value, note)
    VALUES (v_row.user_id, v_row.date, 'walenie', 1, v_row.context_note)
    ON CONFLICT (user_id, date, behavior_key)
    DO UPDATE SET value = 1, note = COALESCE(EXCLUDED.note, public.behavior_log.note);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS habit_logs_sync_lenie ON public.habit_logs;
CREATE TRIGGER habit_logs_sync_lenie
  AFTER INSERT OR UPDATE OR DELETE ON public.habit_logs
  FOR EACH ROW EXECUTE FUNCTION public.sync_lenie_behavior_log();

-- Uzupełnienie historii: dotychczasowe wpisy z behavior_log (z notatkami) zostają nietknięte.
INSERT INTO public.behavior_log (user_id, date, behavior_key, value, note)
SELECT l.user_id, l.date, 'walenie', 1, l.context_note
  FROM public.habit_logs l
  JOIN public.habits h ON h.id = l.habit_id
 WHERE h.name = 'Lenie' AND l.completed IS TRUE
ON CONFLICT (user_id, date, behavior_key) DO NOTHING;
