import { useEffect } from 'react';

export const FOCUS_PULSE_MS = 1500;
const MAX_FRAMES = 40;

/**
 * Po skoku z wyszukiwania przewija do bloku wydarzenia i krótko go podświetla.
 * Blok pojawia się dopiero po przerysowaniu na nowy dzień, więc szukamy go klatka po klatce (do ~0,7 s).
 */
export function useCalendarFocusEvent(eventId: string | null, onDone: () => void) {
  useEffect(() => {
    if (!eventId) return undefined;
    let frame = 0;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let target: Element | null = null;

    const finish = () => {
      target?.classList.remove('calendar-event-pulse');
      onDone();
    };
    const find = () => {
      target = document.querySelector(`[data-event-id="${CSS.escape(eventId)}"]`);
      if (target) {
        target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        target.classList.add('calendar-event-pulse');
        timer = setTimeout(finish, FOCUS_PULSE_MS);
        return;
      }
      frame += 1;
      if (frame >= MAX_FRAMES) {
        onDone();
        return;
      }
      raf = requestAnimationFrame(find);
    };
    raf = requestAnimationFrame(find);

    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
      target?.classList.remove('calendar-event-pulse');
    };
  }, [eventId, onDone]);
}
