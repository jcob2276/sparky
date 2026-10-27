/**
 * @module calendarDragMath
 * @role Czysta matematyka przeciągania wydarzeń (przyciąganie do 15 min, granice dnia, strefa zmiany długości)
 *          oraz stałe gestów. Mysz i dotyk używają tych samych reguł, więc zachowują się identycznie.
 */
import { HOUR_START, HOUR_END, PX_PER_MIN } from './calendarHelpers';

export type DragAction = 'move' | 'resize';

export const SNAP_MINUTES = 15;
/** Mysz: ruch poniżej tego progu (px) to kliknięcie, nie przeciągnięcie. */
export const MOUSE_DRAG_PX = 5;
/** Dotyk: przytrzymanie w miejscu tak długo włącza przeciąganie (krócej to stuknięcie, ruch to przewijanie). */
export const LONG_PRESS_MS = 350;
/** Dotyk: ruch palca większy niż tyle (px) przed końcem przytrzymania anuluje je i zostawia przewijanie. */
export const TOUCH_CANCEL_PX = 8;
/** Dotyk: przytrzymanie w tej dolnej strefie bloku (px) zmienia długość zamiast przesuwać. */
export const RESIZE_ZONE_PX = 18;

export function snapDeltaMinutes(diffPx: number): number {
  return Math.round(diffPx / PX_PER_MIN / SNAP_MINUTES) * SNAP_MINUTES;
}

/** Nowe godziny po przesunięciu o `diffMins`: przesunięcie zostaje w granicach dnia, zmiana długości trzyma minimum. */
export function computeDraggedTimes(input: {
  action: DragAction;
  startMin: number;
  endMin: number;
  diffMins: number;
}): { startMin: number; endMin: number } {
  const { action, startMin, endMin, diffMins } = input;
  if (action === 'move') {
    const duration = endMin - startMin;
    const nextStart = Math.max(HOUR_START * 60, Math.min(HOUR_END * 60 - duration, startMin + diffMins));
    return { startMin: nextStart, endMin: nextStart + duration };
  }
  return { startMin, endMin: Math.max(startMin + SNAP_MINUTES, Math.min(HOUR_END * 60, endMin + diffMins)) };
}

/** Dotyk bez osobnego uchwytu: przytrzymanie przy dolnej krawędzi bloku oznacza zmianę długości. */
export function touchDragAction(requested: DragAction, cardBottomPx: number, touchY: number): DragAction {
  return requested === 'move' && cardBottomPx - touchY <= RESIZE_ZONE_PX ? 'resize' : requested;
}
