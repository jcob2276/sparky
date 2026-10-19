import { useRef, useState, useCallback, useEffect } from 'react';
import type { TodoItemRow } from '../../lib/todo/todo';

type SwipeableItem = TodoItemRow;

interface UseTodoCardSwipeOptions {
  onToggle: () => void;
  item: SwipeableItem;
  onDragStart?: (item: SwipeableItem, clientX: number, clientY: number) => void;
}

const SWIPE_LOCK_PX = 12;
const SWIPE_ARM_PX = 88;
const SWIPE_MAX_PX = 132;
const SWIPE_IGNORE = 'input, textarea, select, [data-no-view-swipe], .todo-focus-expanded';

interface SwipeState {
  x: number;
  y: number;
  locked: boolean;
  dead: boolean;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Grip drag (long-press / mouse) + horizontal swipe-right-to-complete on touch screens. */
export function useTodoCardSwipe({
  onToggle,
  item,
  onDragStart,
}: UseTodoCardSwipeOptions) {
  const gripLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null);
  const handleComplete = useCallback(() => onToggle(), [onToggle]);

  useEffect(() => () => {
    if (gripLongPressTimer.current) clearTimeout(gripLongPressTimer.current);
  }, []);

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

  const onToggleRef = useRef(onToggle);
  useEffect(() => { onToggleRef.current = onToggle; }, [onToggle]);

  // Native listeners on the row element (state-held, so no ref object leaks into render).
  useEffect(() => {
    const el = rowEl;
    if (!el) return;
    let state: SwipeState | null = null;
    const reset = (animate: boolean) => {
      el.style.transition = animate && !prefersReducedMotion() ? 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)' : '';
      el.style.transform = '';
      el.removeAttribute('data-swipe-armed');
    };
    const onStart = (e: TouchEvent) => {
      const target = e.target as Element | null;
      if (e.touches.length !== 1 || !target || target.closest(SWIPE_IGNORE)) { state = null; return; }
      const t = e.touches[0];
      state = { x: t.clientX, y: t.clientY, locked: false, dead: false };
      el.style.transition = '';
    };
    const onMove = (e: TouchEvent) => {
      if (!state || state.dead) return;
      const t = e.touches[0];
      const dx = t.clientX - state.x;
      const dy = t.clientY - state.y;
      if (!state.locked) {
        if (Math.abs(dy) > SWIPE_LOCK_PX && Math.abs(dy) > Math.abs(dx)) { state.dead = true; return; }
        if (dx < -SWIPE_LOCK_PX) { state.dead = true; return; }
        if (dx < SWIPE_LOCK_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        state.locked = true;
        if (gripLongPressTimer.current) clearTimeout(gripLongPressTimer.current);
      }
      const shift = Math.max(0, Math.min(dx, SWIPE_MAX_PX));
      el.style.transform = `translate3d(${shift}px, 0, 0)`;
      if (shift >= SWIPE_ARM_PX) el.setAttribute('data-swipe-armed', 'true');
      else el.removeAttribute('data-swipe-armed');
    };
    const onEnd = () => {
      const wasLocked = state?.locked;
      state = null;
      if (!wasLocked) return;
      const armed = el.getAttribute('data-swipe-armed') === 'true';
      reset(true);
      if (armed) onToggleRef.current();
    };
    const onCancel = () => {
      const wasLocked = state?.locked;
      state = null;
      if (wasLocked) reset(true);
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onCancel);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onCancel);
    };
  }, [rowEl]);

  return {
    onGripTouchStart, onGripTouchEnd, onGripTouchMove, onGripMouseDown,
    handleComplete,
    setRowEl,
  };
}
