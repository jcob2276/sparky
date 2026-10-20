import { useCallback, useEffect, useRef, useState } from 'react';
import type { DetailsAnchor } from '../ouraTabs';

export const ANCHORS: Array<{ id: DetailsAnchor; label: string }> = [
  { id: 'sleep', label: 'Sen' },
  { id: 'rhythm', label: 'Rytm' },
  { id: 'drivers', label: 'Zależności' },
  { id: 'recovery', label: 'Regeneracja' },
  { id: 'charts', label: 'Wykresy' },
];

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Przewijanie do sekcji (z poszanowaniem reduced motion) + podświetlanie aktywnej kotwicy. */
export function useDetailsAnchor(initialAnchor?: DetailsAnchor) {
  const [active, setActive] = useState<DetailsAnchor>(initialAnchor ?? 'sleep');
  const root = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback((id: DetailsAnchor, smooth = true) => {
    const target = root.current?.querySelector<HTMLElement>(`[data-anchor="${id}"]`);
    if (!target) return;
    setActive(id);
    target.scrollIntoView({ behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto', block: 'start' });
  }, []);

  useEffect(() => {
    if (initialAnchor) scrollTo(initialAnchor, false);
  }, [initialAnchor, scrollTo]);

  useEffect(() => {
    const node = root.current;
    if (!node) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const sections = [...node.querySelectorAll<HTMLElement>('[data-anchor]')];
      const current = sections.filter((el) => el.getBoundingClientRect().top <= 140).pop() ?? sections[0];
      const id = current?.getAttribute('data-anchor') as DetailsAnchor | null;
      if (id) setActive(id);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return { active, root, scrollTo };
}
