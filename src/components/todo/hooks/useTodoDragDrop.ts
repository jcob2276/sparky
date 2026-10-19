import { useCallback, useEffect, useRef, useState } from 'react';
import { getTodayWarsaw } from '../../../lib/date';
import { updateTodoItem } from '../../../lib/todo/todo';
import type { TodoItemRow, TodoSectionRow } from '../useTodoData';
import { applyOptimisticPatch } from '../todoOptimistic';

interface UseTodoDragDropProps {
  sections: TodoSectionRow[];
  collapsedSections: Record<string, boolean>;
  setCollapsedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setError: (err: string | null) => void;
  setItems: (updater: TodoItemRow[] | ((prev: TodoItemRow[]) => TodoItemRow[])) => void;
}

function findScrollParent(start: HTMLElement | null): HTMLElement | null {
  for (let el = start?.parentElement ?? null; el; el = el.parentElement) {
    const overflowY = getComputedStyle(el).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return el;
  }
  return null;
}

export function useTodoDragDrop({
  sections,
  collapsedSections,
  setCollapsedSections,
  setError,
  setItems,
}: UseTodoDragDropProps) {
  const [draggingItem, setDraggingItem] = useState<TodoItemRow | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const dragPosRef = useRef({ x: 0, y: 0 });
  const dragItemRef = useRef<TodoItemRow | null>(null);

  const todayZoneRef = useRef<HTMLDivElement>(null);
  const inboxZoneRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-expand collapsed sections when dragging a card over them for 500ms
  useEffect(() => {
    if (draggingItem === null || !dragTarget) return;
    if (collapsedSections[dragTarget]) {
      const timer = setTimeout(() => {
        setCollapsedSections(prev => ({ ...prev, [dragTarget]: false }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [dragTarget, collapsedSections, draggingItem, setCollapsedSections]);

  const getSectionAtPoint = useCallback((x: number, y: number) => {
    if (todayZoneRef.current) {
      const r = todayZoneRef.current.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return 'today';
    }
    if (inboxZoneRef.current) {
      const r = inboxZoneRef.current.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return 'inbox';
    }
    for (const sec of sections) {
      const el = sectionRefs.current[sec.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return sec.id;
    }
    return null;
  }, [sections]);

  useEffect(() => {
    if (!draggingItem) return;

    const finish = () => {
      dragItemRef.current = null;
      setDraggingItem(null);
      setDragTarget(null);
    };

    const onMove = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      const t = ('touches' in e) ? e.touches?.[0] : e;
      if (!t) return;
      dragPosRef.current = { x: t.clientX, y: t.clientY };
      const b = getSectionAtPoint(t.clientX, t.clientY);
      setDragTarget((prev) => prev !== b ? b : prev);
    };

    const onEnd = (e: TouchEvent | MouseEvent) => {
      const t = ('changedTouches' in e) ? e.changedTouches?.[0] : e;
      const item = dragItemRef.current;
      const target = t ? getSectionAtPoint(t.clientX, t.clientY) : null;
      if (target && item) commitDrop(item, target);
      finish();
    };

    // Interrupted gestures (system swipe, Esc) must never leave a ghost stuck on screen.
    const onCancel = () => finish();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };

    // Items are optimistic: the card jumps instantly and is rolled back if the write fails.
    function commitDrop(item: TodoItemRow, target: string) {
      let patch: Partial<TodoItemRow>;
      if (target === 'today') {
        patch = { due_date: getTodayWarsaw(), ai_bucket: 'today', ai_classified_at: new Date().toISOString() };
      } else {
        const sectionId = target === 'inbox' ? null : target;
        if (item.section_id === sectionId) return;
        patch = { section_id: sectionId };
      }
      applyOptimisticPatch(setItems, item, patch, () => updateTodoItem(item.id, patch), setError);
    }

    document.addEventListener('mousemove', onMove, { capture: true });
    document.addEventListener('touchmove', onMove, { passive: false, capture: true });
    document.addEventListener('mouseup', onEnd, { capture: true });
    document.addEventListener('touchend', onEnd, { capture: true });
    document.addEventListener('touchcancel', onCancel, { capture: true });
    document.addEventListener('keydown', onKey, { capture: true });

    return () => {
      document.removeEventListener('mousemove', onMove, { capture: true });
      document.removeEventListener('touchmove', onMove, { capture: true });
      document.removeEventListener('mouseup', onEnd, { capture: true });
      document.removeEventListener('touchend', onEnd, { capture: true });
      document.removeEventListener('touchcancel', onCancel, { capture: true });
      document.removeEventListener('keydown', onKey, { capture: true });
    };
  }, [draggingItem, getSectionAtPoint, setItems, setError]);

  // Long lists: dragging near the top/bottom edge of the scroll area scrolls it, and the target is re-evaluated.
  useEffect(() => {
    if (!draggingItem) return;
    const EDGE = 72;
    const MAX_STEP = 18;
    let raf = 0;
    const tick = () => {
      const { x, y } = dragPosRef.current;
      const scroller = findScrollParent(todayZoneRef.current ?? inboxZoneRef.current ?? Object.values(sectionRefs.current).find(Boolean) ?? null);
      if (scroller) {
        const rect = scroller.getBoundingClientRect();
        const top = Math.max(rect.top, 0);
        const bottom = Math.min(rect.bottom, window.innerHeight);
        let step = 0;
        if (y < top + EDGE) step = -MAX_STEP * Math.min(1, (top + EDGE - y) / EDGE);
        else if (y > bottom - EDGE) step = MAX_STEP * Math.min(1, (y - (bottom - EDGE)) / EDGE);
        if (step !== 0) {
          scroller.scrollTop += step;
          const next = getSectionAtPoint(x, y);
          setDragTarget((prev) => (prev !== next ? next : prev));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draggingItem, getSectionAtPoint]);

  const handleDragStart = useCallback((item: TodoItemRow, x: number, y: number) => {
    dragItemRef.current = item;
    dragPosRef.current = { x, y };
    setDraggingItem(item);
  }, []);

  return {
    draggingItem,
    setDraggingItem,
    dragTarget,
    setDragTarget,
    dragPosRef,
    dragItemRef,
    todayZoneRef,
    inboxZoneRef,
    sectionRefs,
    handleDragStart,
  };
}
