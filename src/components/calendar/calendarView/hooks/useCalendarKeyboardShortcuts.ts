import { useEffect } from 'react';
import { weekMon } from '../../calendarHelpers';
import { shiftPeriodDates } from '../calendarViewHelpers';
import type { useCalendarData } from '../../hooks/useCalendarData';

interface UseCalendarKeyboardShortcutsOptions {
  calData: ReturnType<typeof useCalendarData>;
  today: string;
  onHelp: () => void;
}

/** Skróty jednoklawiszowe nie sterują kalendarzem spod otwartego okna, menu ani popovera. */
const OVERLAY_SELECTOR = '[role="dialog"][aria-modal="true"], [role="menu"], [data-radix-popper-content-wrapper]';

export function useCalendarKeyboardShortcuts({
  calData,
  today,
  onHelp,
}: UseCalendarKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // ⌘Z / ⇧⌘Z obsługuje globalny ActionHistoryController; własny handler kalendarza dublował cofnięcie.

      // If viewing event details, handle edit and delete shortcuts
      if (calData.viewingEvent) {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          const ev = calData.viewingEvent;
          void calData.deleteEventWithUndo(ev);
          return;
        }
        if (key === 'e') {
          e.preventDefault();
          calData.openEditFromPreview(calData.viewingEvent);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          calData.setViewingEvent(null);
          return;
        }
      }

      if (e.key === 'Escape' && calData.quickCreate) {
        e.preventDefault();
        calData.closeQuickCreate();
        return;
      }

      // Kombinacje z Ctrl/Cmd/Alt (np. kopiowanie) i otwarte okna dialogowe nie sterują kalendarzem pod spodem.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector(OVERLAY_SELECTOR)) return;

      if (e.key === '?') {
        e.preventDefault();
        onHelp();
        return;
      }

      const isPrev = e.key === 'ArrowLeft' || key === 'k';
      const isNext = e.key === 'ArrowRight' || key === 'j';

      if (isPrev || isNext) {
        e.preventDefault();
        const { nextSelectedDay, nextWeekStart } = shiftPeriodDates(
          calData.calView,
          calData.selectedDay,
          calData.weekStart,
          isPrev ? -1 : 1,
        );
        calData.setSelectedDay(nextSelectedDay);
        calData.setWeekStart(nextWeekStart);
      } else if (key === 'd' || key === '1') {
        calData.setCalView('dzien');
      } else if (key === '3') {
        calData.setCalView('3dni');
      } else if (key === 'w' || key === '7') {
        calData.setCalView('tydzien');
      } else if (key === 'm') {
        calData.setCalView('miesiac');
      } else if (key === 't') {
        calData.setSelectedDay(today);
        calData.setWeekStart(weekMon(today));
      } else if (key === 'c') {
        calData.setQuickCreate({ date: calData.selectedDay, startMin: 540 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [calData, today, onHelp]);
}
