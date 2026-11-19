import { useCallback, useRef } from 'react';
import type { TodoViewMode } from '../TodoHeader';
import { shouldBlockSwipeNav } from '../../../lib/motion/iosMotion';

const VIEW_ORDER: TodoViewMode[] = ['lista', 'eisenhower', 'kanban'];

export function useTodoViewSwipe(
  currentView: TodoViewMode,
  setCurrentView: (view: TodoViewMode) => void,
) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    const target = event.target instanceof SVGElement ? event.target.closest('button, a, [data-no-view-swipe]') : event.target;
    if (event.touches.length !== 1 || !touch || shouldBlockSwipeNav(target)) {
      start.current = null;
      return;
    }
    start.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }, []);

  const onTouchEnd = useCallback((event: React.TouchEvent) => {
    const gesture = start.current;
    start.current = null;
    const touch = event.changedTouches[0];
    if (!gesture || !touch) return;

    const deltaX = touch.clientX - gesture.x;
    const deltaY = touch.clientY - gesture.y;
    if (Math.abs(deltaX) < 96 || Math.abs(deltaX) <= Math.abs(deltaY) * 2.5) return;

    const currentIndex = VIEW_ORDER.indexOf(currentView);
    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    const nextView = VIEW_ORDER[nextIndex];
    if (nextView) setCurrentView(nextView);
  }, [currentView, setCurrentView]);

  const onTouchCancel = useCallback(() => { start.current = null; }, []);

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
