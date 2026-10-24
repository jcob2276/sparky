import { useCallback, useState } from 'react';

/**
 * Który okres oglądamy i z którym go zestawiamy, jako liczba okresów wstecz od bieżącego.
 * Dopóki użytkownik sam nie wybierze porównania, ono podąża za wyborem (zawsze okres tuż wcześniej).
 */
export function useChronicleSelection() {
  const [offset, setOffset] = useState(0);
  const [compareOffset, setCompareOffset] = useState(1);
  const [following, setFollowing] = useState(true);

  /** `delta` > 0 cofa się w przeszłość; przyszłości nie ma. */
  const shiftMain = useCallback((delta: number) => {
    const next = Math.max(0, offset + delta);
    if (next === offset) return;
    setOffset(next);
    if (following || compareOffset === next) setCompareOffset(next + 1);
  }, [offset, compareOffset, following]);

  const shiftCompare = useCallback((delta: number) => {
    let next = compareOffset + delta;
    if (next === offset) next += delta;
    if (next < 0) return;
    setFollowing(false);
    setCompareOffset(next);
  }, [offset, compareOffset]);

  /** Ustawia wybór z zewnątrz (skrót z innej zakładki); porównanie przestaje podążać, jeśli nie jest „tuż wcześniej”. */
  const apply = useCallback((nextOffset: number, nextCompareOffset: number) => {
    setOffset(Math.max(0, nextOffset));
    setCompareOffset(Math.max(0, nextCompareOffset));
    setFollowing(nextCompareOffset === nextOffset + 1);
  }, []);

  const reset = useCallback(() => {
    setOffset(0);
    setCompareOffset(1);
    setFollowing(true);
  }, []);

  return { offset, compareOffset, shiftMain, shiftCompare, apply, reset };
}
