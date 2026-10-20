import { useEffect, useRef, useState } from 'react';

const FALLBACK_WIDTH = 320;

/** Szerokość elementu (px), śledzona przez ResizeObserver; bez obserwatora (testy) zwraca wartość domyślną. */
export function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const update = () => {
      const next = Math.round(node.clientWidth);
      if (next > 0) setWidth(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
