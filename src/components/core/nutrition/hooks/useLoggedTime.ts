import { useCallback, useEffect, useRef, useState } from 'react';
import { warsawTimeOfDay } from '../../../../lib/date';

const nowWarsawTime = () => warsawTimeOfDay(new Date().toISOString());

/**
 * Godzina posiłku w kompozytorze. Bez ręcznej zmiany zawsze liczy się z chwili zapisu,
 * a nie z chwili zamontowania komponentu (aplikacja żyje cały dzień, więc stary stan
 * przypisywał wieczornym posiłkom godzinę z rana i psuł analizę snu i kofeiny).
 */
export function useLoggedTime(hasDraft: boolean) {
  const [loggedTime, setLoggedTime] = useState(nowWarsawTime);
  const touchedRef = useRef(false);

  useEffect(() => {
    if (!hasDraft) touchedRef.current = false;
    else if (!touchedRef.current) setLoggedTime(nowWarsawTime());
  }, [hasDraft]);

  const setManualLoggedTime = useCallback((value: string) => {
    touchedRef.current = true;
    setLoggedTime(value);
  }, []);

  const resetLoggedTime = useCallback(() => {
    touchedRef.current = false;
    setLoggedTime(nowWarsawTime());
  }, []);

  const resolveLoggedTime = useCallback(
    () => (touchedRef.current ? loggedTime : nowWarsawTime()),
    [loggedTime],
  );

  return { loggedTime, setManualLoggedTime, resetLoggedTime, resolveLoggedTime };
}
