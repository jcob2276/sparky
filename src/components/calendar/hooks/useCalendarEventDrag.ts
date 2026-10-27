import type { QueryClient } from '@tanstack/react-query';
import { calendarKeys } from '../../../lib/queryKeys';
import { dateOfISO, getWarsawOffset, parseTime, CalRow } from '../calendarHelpers';
import { notify } from '../../../lib/notify';
import { undoAction } from '../../../lib/actionHistory';
import { haptics } from '../../../hooks/useHaptics';
import { recordCalendarUpdate, useCalendarWriters } from '../calendarHistory';
import {
  LONG_PRESS_MS, MOUSE_DRAG_PX, TOUCH_CANCEL_PX,
  computeDraggedTimes, snapDeltaMinutes, touchDragAction, type DragAction,
} from '../calendarDragMath';

interface VisibleRange {
  rangeStart: string;
  rangeEnd: string;
}

interface UseCalendarEventDragParams {
  userId: string | undefined;
  accessToken: string | undefined;
  queryClient: QueryClient;
  visibleRange: VisibleRange;
  updateEventMutation: {
    mutateAsync: (args: {
      userId: string;
      accessToken: string;
      event: { id: string; summary: string; start: string; end: string; category?: string; description?: string; recurrence?: string[] | null; location?: string; is_all_day?: boolean; reminder_minutes?: number | null };
    }) => Promise<unknown>;
  };
  onEventClick: (ev: CalRow) => void;
  setToastMessage: (msg: string | null) => void;
}

type PointerEventLike = React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>;

interface DragSession {
  move: (clientX: number, clientY: number) => void;
  end: (clientY: number) => Promise<void>;
  cancel: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (date: string, min: number) => `${date}T${pad(Math.floor(min / 60))}:${pad(min % 60)}:00${getWarsawOffset(date)}`;
const isCoarsePointer = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export function useCalendarEventDrag({
  userId,
  accessToken,
  queryClient,
  visibleRange,
  updateEventMutation,
  onEventClick,
  setToastMessage,
}: UseCalendarEventDragParams) {
  const writers = useCalendarWriters({ userId, accessToken, updateEventMutation });
  const eventsKey = calendarKeys.events(userId || '', visibleRange.rangeStart, visibleRange.rangeEnd);

  /** Wspólna sesja przeciągania: mysz startuje po progu ruchu, dotyk (`immediate`) po długim przytrzymaniu. */
  const beginSession = (
    ev: CalRow,
    action: DragAction,
    cardElement: HTMLDivElement | null,
    startX: number,
    startY: number,
    immediate: boolean,
  ): DragSession => {
    const initialStartMin = parseTime(ev.start_time!);
    const initialEndMin = parseTime(ev.end_time!);
    const originalDate = dateOfISO(ev.start_time!);
    // 'move' może przejść do innej kolumny dnia; 'resize' nigdy nie zmienia dnia wydarzenia.
    let eventDate = originalDate;
    let isDragging = false;
    let lastDiffMins = 0;
    let lastDay = originalDate;

    const lift = () => {
      isDragging = true;
      if (cardElement) {
        cardElement.style.transition = 'none';
        cardElement.style.zIndex = '50';
        cardElement.style.boxShadow = '0 16px 32px -4px rgba(0, 0, 0, 0.4)';
        cardElement.style.opacity = '0.92';
      }
      document.body.style.cursor = action === 'resize' ? 'ns-resize' : 'grabbing';
    };
    const drop = () => {
      document.body.style.cursor = '';
      if (cardElement) {
        cardElement.style.transition = '';
        cardElement.style.zIndex = '';
        cardElement.style.boxShadow = '';
        cardElement.style.opacity = '';
      }
    };
    const revert = () => { void queryClient.invalidateQueries({ queryKey: eventsKey }); };
    if (immediate) lift();

    const dayUnderCursor = (clientX: number, clientY: number): string | null =>
      document.elementFromPoint(clientX, clientY)?.closest('[data-day-col]')?.getAttribute('data-day-col') || null;

    const move = (clientX: number, clientY: number) => {
      if (!isDragging) {
        if (Math.hypot(clientX - startX, clientY - startY) < MOUSE_DRAG_PX) return;
        lift();
      }
      const diffMins = snapDeltaMinutes(clientY - startY);
      if (action === 'move') {
        const hoveredDay = dayUnderCursor(clientX, clientY);
        if (hoveredDay) eventDate = hoveredDay;
      }
      if (diffMins === lastDiffMins && eventDate === lastDay) return;
      lastDiffMins = diffMins;
      lastDay = eventDate;

      const times = computeDraggedTimes({ action, startMin: initialStartMin, endMin: initialEndMin, diffMins });
      // Tymczasowa lokalna aktualizacja, żeby przeciąganie było płynne
      queryClient.setQueryData(eventsKey, (old: CalRow[] | undefined) => (old || []).map((item) => (
        item.id !== ev.id ? item : { ...item, start_time: toISO(eventDate, times.startMin), end_time: toISO(eventDate, times.endMin) }
      )));
    };

    const end = async (clientY: number) => {
      drop();
      if (!isDragging) {
        onEventClick(ev);
        return;
      }
      const diffMins = snapDeltaMinutes(clientY - startY);
      if (diffMins === 0 && eventDate === originalDate) {
        // Wrócił w to samo miejsce: bez zapisu, tylko odtwórz cache
        revert();
        return;
      }
      const times = computeDraggedTimes({ action, startMin: initialStartMin, endMin: initialEndMin, diffMins });
      const before = {
        id: ev.event_id || ev.id,
        summary: ev.summary || '',
        start: ev.start_time!,
        end: ev.end_time!,
        category: ev.category || undefined,
        description: ev.description || undefined,
        recurrence: ev.recurrence || undefined,
        location: ev.location || undefined,
        is_all_day: ev.is_all_day ?? false,
        reminder_minutes: ev.reminder_minutes ?? null,
      };
      const after = { ...before, start: toISO(eventDate, times.startMin), end: toISO(eventDate, times.endMin) };
      try {
        await writers.update(after);
        const actionId = recordCalendarUpdate(writers, { label: `Zmiana czasu: ${ev.summary || 'Wydarzenie'}`, before, after });
        notify('Zaktualizowano czas wydarzenia.', 'success', {
          action: { label: 'Cofnij', onClick: () => { void undoAction(actionId); } },
        });
      } catch (err) {
        console.error('Failed to save drag/resize changes:', err);
        setToastMessage('Nie udało się zapisać zmian.');
        // Przy błędzie wróć do oryginalnych wartości
        revert();
      }
    };

    return { move, end, cancel: () => { drop(); revert(); } };
  };

  const startMouseDrag = (ev: CalRow, e: React.MouseEvent<HTMLDivElement>, action: DragAction) => {
    const cardElement = (action === 'resize' ? e.currentTarget.parentElement : e.currentTarget) as HTMLDivElement | null;
    const session = beginSession(ev, action, cardElement, e.clientX, e.clientY, false);
    const handleMouseMove = (moveEvent: MouseEvent) => session.move(moveEvent.clientX, moveEvent.clientY);
    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      void session.end(upEvent.clientY);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  /**
   * Dotyk: przewijanie wygrywa, dopóki palec nie postoi LONG_PRESS_MS. Wtedy blok „unosi się” (wibracja),
   * a dalszy ruch przesuwa go (przytrzymanie przy dolnej krawędzi zmienia długość). Ruch przed końcem
   * przytrzymania anuluje gest. Zwykłe stuknięcie nadal otwiera podgląd przez ścieżkę myszy.
   */
  const startTouchDrag = (ev: CalRow, e: React.TouchEvent<HTMLDivElement>, action: DragAction) => {
    if (e.touches.length !== 1 || ev.series_id) return;
    const { clientX: startX, clientY: startY } = e.touches[0];
    const cardElement = (action === 'resize' ? e.currentTarget.parentElement : e.currentTarget) as HTMLDivElement | null;
    const effective = cardElement ? touchDragAction(action, cardElement.getBoundingClientRect().bottom, startY) : action;
    let session: DragSession | null = null;

    const cleanup = () => {
      clearTimeout(timer);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };
    const timer = setTimeout(() => {
      session = beginSession(ev, effective, cardElement, startX, startY, true);
      haptics.medium();
    }, LONG_PRESS_MS);
    const onTouchMove = (touchEvent: TouchEvent) => {
      const point = touchEvent.touches[0];
      if (!session) {
        if (Math.hypot(point.clientX - startX, point.clientY - startY) > TOUCH_CANCEL_PX) cleanup();
        return;
      }
      touchEvent.preventDefault();
      session.move(point.clientX, point.clientY);
    };
    const onTouchEnd = (touchEvent: TouchEvent) => {
      const active = session;
      cleanup();
      if (!active) return;
      // Bez tego przeglądarka dośle po puszczeniu palca zdarzenia myszy i otworzy podgląd.
      touchEvent.preventDefault();
      void active.end(touchEvent.changedTouches[0].clientY);
    };
    const onTouchCancel = () => {
      const active = session;
      cleanup();
      active?.cancel();
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('touchcancel', onTouchCancel);
  };

  /** Wejście z bloku wydarzenia i uchwytu zmiany długości: mysz albo dotyk (jedna funkcja, bez nowych propsów). */
  const handleEventMouseDown = (ev: CalRow, e: PointerEventLike, action: DragAction) => {
    e.stopPropagation();
    if ('touches' in e) {
      if (ev.start_time && ev.end_time) startTouchDrag(ev, e, action);
      return;
    }
    e.preventDefault();
    if (!ev.start_time || !ev.end_time) return;
    if (isCoarsePointer()) {
      onEventClick(ev);
      return;
    }
    if (ev.series_id) {
      onEventClick(ev);
      setToastMessage('Cykliczne wydarzenie zmienisz bezpiecznie w edycji całej serii.');
      return;
    }
    startMouseDrag(ev, e, action);
  };

  return { handleEventMouseDown };
}
