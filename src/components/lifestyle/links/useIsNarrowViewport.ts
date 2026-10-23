import { useSyncExternalStore } from 'react';

const NARROW_MAX_PX = 767;
const QUERY = `(max-width: ${NARROW_MAX_PX}px)`;

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getSnapshot() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches;
}

/** Węższy niż breakpoint `md` — pozwala wyrenderować pole tylko raz (jedna instancja refa). */
export function useIsNarrowViewport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
