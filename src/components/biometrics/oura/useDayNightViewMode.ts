import { useCallback, useState } from 'react';
import type { ViewMode } from './ouraDayNightLayout';

const STORAGE_KEY = 'oura-day-night-view';
const NARROW_PX = 640;

function readInitialMode(): ViewMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'full' || stored === 'night') return stored;
  } catch {
    /* storage can be blocked (private mode); fall through to the width-based default */
  }
  return typeof window !== 'undefined' && window.innerWidth < NARROW_PX ? 'night' : 'full';
}

/** "Dzień + noc" on wide screens, "Tylko noc" on narrow ones; an explicit choice is remembered in localStorage. */
export function useDayNightViewMode() {
  const [mode, setMode] = useState<ViewMode>(readInitialMode);
  const update = useCallback((next: ViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);
  return [mode, update] as const;
}
