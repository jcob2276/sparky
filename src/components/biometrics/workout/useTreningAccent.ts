import { useCallback, useEffect, useState } from 'react';
import {
  applyTreningAccent,
  readTreningAccent,
  writeTreningAccent,
  type TreningAccentId,
} from '../../../lib/health/treningAccent';

/** Persist + live-apply trening accent (scoped, not global Sparky theme). */
export function useTreningAccent() {
  const [accent, setAccentState] = useState<TreningAccentId>(() => readTreningAccent());

  useEffect(() => {
    applyTreningAccent(accent);
  }, [accent]);

  const setAccent = useCallback((id: TreningAccentId) => {
    writeTreningAccent(id);
    setAccentState(id);
    applyTreningAccent(id);
  }, []);

  return { accent, setAccent };
}
