/**
 * @file useCalendarViewState.ts
 * @role Wydzielona orkiestracja stanu, kontekstu, mutacji i integracji kalendarza (Wzorzec A).
 */
import { useState, useCallback, useMemo } from 'react';
import { useSession } from '../../../store/useStore';
import { useCalendarData } from './useCalendarData';
import { useTimeBudgets } from './useTimeBudgets';
import { useCalendarTodos } from './useCalendarTodos';
import { todayStr, type CalRow } from '../calendarHelpers';
import { CalendarContextType } from '../context/CalendarContext';
import { calculateWeeklyTotals } from '../calendarView/calendarViewHelpers';
import { useCalendarActions } from '../calendarView/hooks/useCalendarActions';
import { useContextMenuActions } from '../calendarView/hooks/useContextMenuActions';
import { useCalendarIntegrations } from '../calendarView/hooks/useCalendarIntegrations';
import { useCalendarEffects } from '../calendarView/hooks/useCalendarEffects';
import { useCalendarKeyboardShortcuts } from '../calendarView/hooks/useCalendarKeyboardShortcuts';
import { useCalendarFocusEvent } from './useCalendarFocusEvent';
import { dateOfISO, weekMon } from '../calendarHelpers';
import { type CalendarContextMenuState } from '../CalendarContextMenu';

interface UseCalendarViewStateOptions {
  onSyncCalendar: () => void;
  onResyncCalendar?: () => Promise<void> | void;
  isSyncing: boolean;
}

export function useCalendarViewState({
  onSyncCalendar,
  onResyncCalendar,
  isSyncing,
}: UseCalendarViewStateOptions) {
  const session = useSession();
  const userId = session?.user?.id as string | undefined;
  const accessToken = session?.access_token as string | undefined;

  const calData = useCalendarData(userId, accessToken);
  const today = todayStr();
  const [contextMenu, setContextMenu] = useState<CalendarContextMenuState | null>(null);

  const handleEventContextMenu = useCallback((event: CalRow, e: React.MouseEvent) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      event,
    });
  }, []);

  const {
    handleChangeCategory: handleContextMenuChangeCategory,
    handleMoveToDate: handleContextMenuMoveToDate,
    handleDuplicate: handleContextMenuDuplicate,
  } = useContextMenuActions({
    userId,
    accessToken,
    createEventMutation: calData.createEventMutation,
    updateEventMutation: calData.updateEventMutation,
    deleteEventMutation: calData.deleteEventMutation,
    setToastMessage: calData.setToastMessage,
  });

  const calTodos = useCalendarTodos({
    userId: userId || '',
    rangeStart: calData.visibleRange.rangeStart,
    rangeEnd: calData.visibleRange.rangeEnd,
  });

  const timeBudgets = useTimeBudgets(userId || '');

  const categoryWeeklyTotals = useMemo(() => {
    return calculateWeeklyTotals(calData.events, calData.weekStart, 0);
  }, [calData.events, calData.weekStart]);

  const categoryPrevWeeklyTotals = useMemo(() => {
    return calculateWeeklyTotals(calData.events, calData.weekStart, -7);
  }, [calData.events, calData.weekStart]);

  const actions = useCalendarActions({
    userId,
    accessToken,
    calData,
    calTodos,
    onResyncCalendar,
  });

  const integrations = useCalendarIntegrations({
    userId,
    accessToken,
    selectedDay: calData.selectedDay,
    createEventMutation: calData.createEventMutation,
    updateEventMutation: calData.updateEventMutation,
    fetchEvents: calData.fetchEvents,
    setToastMessage: calData.setToastMessage,
  });

  useCalendarEffects({
    quickCreate: calData.quickCreate,
    closeQuickCreate: calData.closeQuickCreate,
    editingTodo: calData.editingTodo,
    setEditingTodo: calData.setEditingTodo,
    selectedEvent: calData.selectedEvent,
    setSelectedEvent: calData.setSelectedEvent,
    showBudgetConfig: calData.showBudgetConfig,
    setShowBudgetConfig: calData.setShowBudgetConfig,
    toastMessage: calData.toastMessage,
    setToastMessage: calData.setToastMessage,
  });

  // Global keyboard shortcuts (views, arrows, quick create, backspace/delete, edit)
  const [focusEventId, setFocusEventId] = useState<string | null>(null);
  const clearFocusEvent = useCallback(() => setFocusEventId(null), []);
  useCalendarFocusEvent(focusEventId, clearFocusEvent);
  const { calView, setCalView, setSelectedDay, setWeekStart } = calData;
  const jumpToEvent = useCallback((event: { id: string; start_time: string | null }) => {
    if (!event.start_time) return;
    const day = dateOfISO(event.start_time);
    // Miesiąc nie ma bloków czasowych do podświetlenia, więc skok przełącza na tydzień.
    if (calView === 'miesiac') setCalView('tydzien');
    setSelectedDay(day);
    setWeekStart(weekMon(day));
    setFocusEventId(event.id);
  }, [calView, setCalView, setSelectedDay, setWeekStart]);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  useCalendarKeyboardShortcuts({ calData, today, onHelp: openShortcuts });

  const contextValue: CalendarContextType = useMemo(
    () => ({
      userId,
      accessToken,
      today,
      calData,
      calTodos,
      timeBudgets,
      categoryWeeklyTotals,
      categoryPrevWeeklyTotals,
      jumpToEvent,
      isSyncing,
      isSyncingOura: integrations.isSyncingOura,
      isSyncingActivities: integrations.isSyncingActivities,
      onSyncCalendar,
      syncOura: integrations.syncOura,
      syncActivities: integrations.syncActivities,
      handleQuickSave: actions.handleQuickSave,
      handleEditSave: actions.handleEditSave,
      closeEditTodoModal: actions.closeEditTodoModal,
      saveTodoTitle: actions.saveTodoTitle,
      saveTodoChanges: actions.saveTodoChanges,
      deleteTodo: actions.handleDeleteTodo,
    }),
    [
      userId,
      accessToken,
      today,
      calData,
      calTodos,
      timeBudgets,
      categoryWeeklyTotals,
      categoryPrevWeeklyTotals,
      jumpToEvent,
      isSyncing,
      integrations.isSyncingOura,
      integrations.isSyncingActivities,
      integrations.syncOura,
      integrations.syncActivities,
      onSyncCalendar,
      actions.handleQuickSave,
      actions.handleEditSave,
      actions.closeEditTodoModal,
      actions.saveTodoTitle,
      actions.saveTodoChanges,
      actions.handleDeleteTodo,
    ],
  );

  return {
    userId,
    today,
    calData,
    calTodos,
    actions,
    contextMenu,
    setContextMenu,
    handleEventContextMenu,
    handleContextMenuChangeCategory,
    handleContextMenuMoveToDate,
    handleContextMenuDuplicate,
    contextValue,
    shortcutsOpen,
    setShortcutsOpen,
  };
}
