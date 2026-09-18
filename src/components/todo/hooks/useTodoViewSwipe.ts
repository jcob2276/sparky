import { useCallback, useRef } from 'react';
import type { TodoViewMode } from '../TodoHeader';
import { shouldBlockSwipeNav } from '../../../lib/motion/iosMotion';

const VIEW_ORDER: TodoViewMode[] = ['lista', 'eisenhower', 'kanban'];

export function useTodoViewSwipe(
  currentView: TodoViewMode,
  setCurrentView: (view: TodoViewMode) => void,
) {
  const start = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null);

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    start.current = {
      x: touch.clientX,
      y: touch.clientY,
      target: event.target,
    };
  }, []);

  const onTouchEnd = useCallback((event: React.TouchEvent) => {
    const gesture = start.current;
    start.current = null;
    const touch = event.changedTouches[0];
    if (!gesture || !touch) return;

    const deltaX = touch.clientX - gesture.x;
    const deltaY = touch.clientY - gesture.y;
    if (Math.abs(deltaX) < 70 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.75) return;
    if (shouldBlockSwipeNav(gesture.target)) return;

    const currentIndex = VIEW_ORDER.indexOf(currentView);
    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    const nextView = VIEW_ORDER[nextIndex];
    if (nextView) setCurrentView(nextView);
  }, [currentView, setCurrentView]);

  return { onTouchStart, onTouchEnd };
}
