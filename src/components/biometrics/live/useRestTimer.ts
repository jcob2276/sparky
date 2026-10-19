import { useCallback, useEffect, useRef, useState } from 'react';
import { useHaptics } from '../../../hooks/useHaptics';

interface RestState {
  endsAt: number;
  startedAt: number;
}

/** Odliczanie przerwy: startuje po zaliczonej serii, bez ręcznego włączania. */
export function useRestTimer() {
  const haptics = useHaptics();
  const [rest, setRest] = useState<RestState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!rest) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [rest]);

  const remaining = rest ? Math.ceil((rest.endsAt - now) / 1000) : 0;
  const finished = rest != null && remaining <= 0;

  useEffect(() => {
    if (finished && !notifiedRef.current) {
      notifiedRef.current = true;
      haptics.success();
    }
  }, [finished, haptics]);

  const start = useCallback((seconds: number) => {
    const t = Date.now();
    notifiedRef.current = false;
    setNow(t);
    setRest({ startedAt: t, endsAt: t + seconds * 1000 });
  }, []);

  const adjust = useCallback((deltaSeconds: number) => {
    setRest((prev) => {
      if (!prev) return prev;
      notifiedRef.current = false;
      return { ...prev, endsAt: Math.max(Date.now() + 1000, prev.endsAt + deltaSeconds * 1000) };
    });
  }, []);

  const skip = useCallback(() => setRest(null), []);

  return { active: rest != null, remaining, finished, elapsedSinceStart: rest ? Math.floor((now - rest.startedAt) / 1000) : 0, start, adjust, skip };
}
