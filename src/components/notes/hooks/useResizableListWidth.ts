import { useCallback, useState } from 'react';

const LIST_WIDTH_KEY = 'sparky.notes.listWidth';
const LIST_WIDTH_DEFAULT = 340;
const LIST_WIDTH_MIN = 260;
const LIST_WIDTH_MAX = 720;

function readListWidth(): number {
  try {
    const stored = Number(window.localStorage.getItem(LIST_WIDTH_KEY));
    if (Number.isFinite(stored) && stored >= LIST_WIDTH_MIN) return Math.min(stored, LIST_WIDTH_MAX);
  } catch { /* brak localStorage: domyślna szerokość */ }
  return LIST_WIDTH_DEFAULT;
}


/** Szerokość listy notatek w widoku dzielonym: przeciąganie, klawiatura, zapamiętanie w localStorage. */
export function useResizableListWidth() {
  const [listWidth, setListWidth] = useState(readListWidth);
  const clamp = (width: number) => Math.min(LIST_WIDTH_MAX, Math.max(LIST_WIDTH_MIN, width));

  const commitListWidth = useCallback((width: number) => {
    const next = Math.round(clamp(width));
    setListWidth(next);
    try { window.localStorage.setItem(LIST_WIDTH_KEY, String(next)); } catch { /* ignoruj */ }
  }, []);

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = listWidth;
    const move = (e: PointerEvent) => setListWidth(clamp(startWidth + e.clientX - startX));
    const up = (e: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      commitListWidth(startWidth + e.clientX - startX);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return { listWidth, startResize, commitListWidth, bounds: { min: LIST_WIDTH_MIN, max: LIST_WIDTH_MAX, default: LIST_WIDTH_DEFAULT } };
}
