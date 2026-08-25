import { useState, useEffect } from 'react';
import { HOUR_START, HOUR_END, PX_PER_MIN } from '../calendarHelpers';

interface DragSelectState {
  day: string;
  startMin: number;
  currentMin: number;
}

interface UseCalendarDragSelectProps {
  setQuickDuration: (duration: number) => void;
  setQuickCreate: (value: { date: string; startMin: number }) => void;
  consumeSwipe?: () => boolean;
}

const isCoarsePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

function minutesFromColumnEvent(currentTarget: EventTarget & HTMLElement, clientY: number) {
  const rect = currentTarget.getBoundingClientRect();
  const offsetY = clientY - rect.top;
  const clickedMin = Math.round(offsetY / PX_PER_MIN / 15) * 15 + HOUR_START * 60;
  return Math.max(HOUR_START * 60, Math.min(HOUR_END * 60 - 15, clickedMin));
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('.cursor-move') ||
      target.closest('.cursor-s-resize') ||
      target.closest('.cursor-grab') ||
      target.closest('button') ||
      target.closest('a'),
  );
}

export const useCalendarDragSelect = ({
  setQuickDuration,
  setQuickCreate,
  consumeSwipe,
}: UseCalendarDragSelectProps) => {
  const [dragSelect, setDragSelect] = useState<DragSelectState | null>(null);

  useEffect(() => {
    if (!dragSelect) return;

    const handleGlobalMouseUp = () => {
      const start = Math.min(dragSelect.startMin, dragSelect.currentMin);
      const end = Math.max(dragSelect.startMin, dragSelect.currentMin);
      const duration = end - start < 15 ? 60 : end - start;
      setQuickDuration(duration);
      setQuickCreate({ date: dragSelect.day, startMin: start });
      setDragSelect(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragSelect, setQuickDuration, setQuickCreate]);

  const handleColumnMouseDown = (day: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (isCoarsePointer()) return;
    if (isInteractiveTarget(e.target)) return;

    const clickedMin = minutesFromColumnEvent(e.currentTarget, e.clientY);
    setDragSelect({ day, startMin: clickedMin, currentMin: clickedMin });
  };

  const handleColumnMouseMove = (day: string, e: React.MouseEvent) => {
    if (!dragSelect || dragSelect.day !== day) return;
    const currentMin = minutesFromColumnEvent(e.currentTarget, e.clientY);
    setDragSelect({ ...dragSelect, currentMin });
  };

  const handleColumnClick = (day: string, e: React.MouseEvent) => {
    if (!isCoarsePointer()) return;
    if (consumeSwipe?.()) return;
    if (isInteractiveTarget(e.target)) return;
    setQuickDuration(60);
    setQuickCreate({ date: day, startMin: minutesFromColumnEvent(e.currentTarget, e.clientY) });
  };

  return {
    dragSelect,
    handleColumnMouseDown,
    handleColumnMouseMove,
    handleColumnClick,
  };
};
