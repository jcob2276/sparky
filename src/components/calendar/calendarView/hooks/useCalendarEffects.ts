import { useEffect } from 'react';
import type { CalRow } from '../../calendarHelpers';
import type { CalendarTodo } from '../../hooks/useCalendarTodos';
import type { QuickCreateState } from '../../hooks/useCalendarData';

interface UseCalendarEffectsOptions {
  quickCreate: QuickCreateState | null;
  closeQuickCreate: () => void;
  editingTodo: CalendarTodo | null;
  setEditingTodo: (v: CalendarTodo | null) => void;
  selectedEvent: CalRow | null;
  setSelectedEvent: (v: CalRow | null) => void;
  showBudgetConfig: boolean;
  setShowBudgetConfig: (v: boolean) => void;
  toastMessage: string | null;
  setToastMessage: (v: string | null) => void;
}

export function useCalendarEffects({
  quickCreate,
  closeQuickCreate,
  editingTodo,
  setEditingTodo,
  selectedEvent,
  setSelectedEvent,
  showBudgetConfig,
  setShowBudgetConfig,
  toastMessage,
  setToastMessage,
}: UseCalendarEffectsOptions) {
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, setToastMessage]);

  // Wyłącznie Escape do zamykania otwartych warstw. Skróty widoków (d/1/3/w/7/m/t/c)
  // należą do pojedynczego handlera w CalendarView — tu były duplikowane (konflikt t/w).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (quickCreate || editingTodo || selectedEvent || showBudgetConfig)) {
        e.preventDefault();
        closeQuickCreate();
        setEditingTodo(null);
        setSelectedEvent(null);
        setShowBudgetConfig(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    quickCreate,
    editingTodo,
    selectedEvent,
    showBudgetConfig,
    closeQuickCreate,
    setEditingTodo,
    setSelectedEvent,
    setShowBudgetConfig,
  ]);
}
