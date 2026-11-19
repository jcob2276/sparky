import { useEffect, useRef, type TouchEventHandler } from 'react';
import { addDays, weekMon } from '../calendarHelpers';
import { isInteractiveTarget, minutesFromColumnEvent } from './useCalendarDragSelect';

interface Options {
  calView: string;
  selectedDay: string;
  setSelectedDay: (day: string) => void;
  setWeekStart: (day: string) => void;
  onHold: (day: string, startMin: number) => void;
}

export function useCalendarGridSwipe(options: Options) {
  const start = useRef<{ x: number; y: number; held: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);
  const cancel = () => {
    clearTimeout(timer.current);
    start.current = null;
  };

  const onTouchStart: TouchEventHandler<HTMLDivElement> = (event) => {
    cancel();
    if (event.touches.length !== 1 || isInteractiveTarget(event.target)) return;
    const { clientX: x, clientY: y } = event.touches[0];
    const gesture = { x, y, held: false };
    start.current = gesture;
    const column = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-day-col]') : null;
    const day = column?.dataset.dayCol;
    if (!column || !day) return;
    const minute = minutesFromColumnEvent(column, y);
    timer.current = setTimeout(() => {
      gesture.held = true;
      options.onHold(day, minute);
    }, 450);
  };

  const onTouchMove: TouchEventHandler<HTMLDivElement> = (event) => {
    if (event.touches.length !== 1) { cancel(); return; }
    const point = event.touches[0];
    if (start.current && Math.hypot(point.clientX - start.current.x, point.clientY - start.current.y) > 10) {
      clearTimeout(timer.current);
    }
  };

  const onTouchEnd: TouchEventHandler<HTMLDivElement> = (event) => {
    const gesture = start.current;
    cancel();
    if (!gesture || gesture.held || event.changedTouches.length !== 1 || options.calView !== 'dzien'
      || document.body.dataset.calendarDragging) return;
    const { clientX, clientY } = event.changedTouches[0];
    const dx = clientX - gesture.x;
    const dy = clientY - gesture.y;
    if (Math.abs(dx) < 64 || Math.abs(dx) <= Math.abs(dy) * 1.8) return;
    const next = addDays(options.selectedDay, dx < 0 ? 1 : -1);
    options.setSelectedDay(next);
    options.setWeekStart(weekMon(next));
  };

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: cancel };
}
