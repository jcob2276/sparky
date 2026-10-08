import { useRef, useCallback } from 'react';
import type { TodoItemRow } from '../../lib/todo/todo';

type SwipeableItem = TodoItemRow;

interface UseTodoCardSwipeOptions {
  onToggle: () => void;
  item: SwipeableItem;
  onDragStart?: (item: SwipeableItem, clientX: number, clientY: number) => void;
}

export function useTodoCardSwipe({
  onToggle,
  item,
  onDragStart,
}: UseTodoCardSwipeOptions) {
  const gripLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleComplete = useCallback(() => onToggle(), [onToggle]);

  // Grip: long press (mobile) / mousedown (desktop)
  const onGripTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const t = e.touches[0];
    gripLongPressTimer.current = setTimeout(() => {
      onDragStart?.(item, t.clientX, t.clientY);
    }, 350);
  }, [onDragStart, item]);

  const onGripTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (gripLongPressTimer.current) clearTimeout(gripLongPressTimer.current);
  }, []);

  const onGripTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (gripLongPressTimer.current) clearTimeout(gripLongPressTimer.current);
  }, []);

  const onGripMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart?.(item, e.clientX, e.clientY);
  }, [onDragStart, item]);

  return {
    onGripTouchStart, onGripTouchEnd, onGripTouchMove, onGripMouseDown,
    handleComplete,
  };
}
