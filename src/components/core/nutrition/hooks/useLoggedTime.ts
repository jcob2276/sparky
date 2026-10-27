import { useCallback, useEffect, useState } from 'react';
import { warsawTimeOfDay } from '../../../../lib/date';

const nowWarsawTime = () => warsawTimeOfDay(new Date().toISOString());
const REFRESH_MS = 10_000;

/**
 * Godzina posiłku w kompozytorze. Bez ręcznej zmiany zawsze jest „teraz": pole żyje
 * razem z zegarem (co kilka sekund, po powrocie do aplikacji i przy każdej zmianie
 * szkicu), a przy zapisie liczy się z chwili zapisu. Aplikacja żyje cały dzień,
 * więc godzina zapamiętana raz przypisywała wieczornym posiłkom godzinę z popołudnia
 * i psuła analizę snu i kofeiny.
 */
export function useLoggedTime(hasDraft: boolean, draftSize = 0) {
  const [manual, setManual] = useState<string | null>(null);
  const [now, setNow] = useState(nowWarsawTime);

  // Zamknięty szkic zapomina ręcznie wybraną godzinę (reset podczas renderu, nie w efekcie).
  const [hadDraft, setHadDraft] = useState(hasDraft);
  if (hadDraft !== hasDraft) {
    setHadDraft(hasDraft);
    if (!hasDraft) setManual(null);
  }

  useEffect(() => {
    if (manual !== null) return;
    const refresh = () => setNow(nowWarsawTime());
    refresh();
    const id = window.setInterval(refresh, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, [manual, hasDraft, draftSize]);

  const setManualLoggedTime = useCallback((value: string) => setManual(value), []);

  const resetLoggedTime = useCallback(() => {
    setManual(null);
    setNow(nowWarsawTime());
  }, []);

  const resolveLoggedTime = useCallback(() => manual ?? nowWarsawTime(), [manual]);

  return { loggedTime: manual ?? now, setManualLoggedTime, resetLoggedTime, resolveLoggedTime };
}
