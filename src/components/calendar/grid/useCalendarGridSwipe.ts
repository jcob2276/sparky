import { useRef, type TouchEventHandler } from 'react';
import { addDays, weekMon } from '../calendarHelpers';

interface Options {
  calView: string;
  selectedDay: string;
  weekStart: string;
  setSelectedDay: (day: string) => void;
  setWeekStart: (day: string) => void;
}

export function useCalendarGridSwipe(options: Options) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swipeConsumed = useRef(false);

  const consumeSwipe = () => {
    if (!swipeConsumed.current) return false;
    swipeConsumed.current = false;
    return true;
  };

  const onTouchStart: TouchEventHandler<HTMLDivElement> = (event) => {
    if (event.touches.length !== 1) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, [role="dialog"]')) return;
    // Week/3-day grids scroll horizontally — swipe would fight the canvas.
    if (options.calView === 'tydzien' || options.calView === '3dni') return;
    touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };

  const onTouchEnd: TouchEventHandler<HTMLDivElement> = (event) => {
    if (!touchStart.current || event.changedTouches.length !== 1) return;
    const deltaX = event.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = event.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(deltaX) <= 80 || Math.abs(deltaY) >= 50) return;

    swipeConsumed.current = true;
    const direction = deltaX < 0 ? 1 : -1;
    if (options.calView === 'dzien') {
      const next = addDays(options.selectedDay, direction);
      options.setSelectedDay(next);
      options.setWeekStart(weekMon(next));
    } else if (options.calView === 'miesiac') {
      const [year, month] = options.selectedDay.split('-').map(Number);
      const next = new Date(year, month - 1 + direction, 1);
      options.setSelectedDay(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`);
    }
  };

  return { onTouchStart, onTouchEnd, consumeSwipe };
}
