/**
 * @component CalendarView
 * @role Top-level orchestrator widoku kalendarza.
 * @folders hooks/ = fetch+mutacje danych | calendarView/ = logika wydzielona z tego pliku pod limit 300 linii
 *          (actions/integrations/effects) | components/ = modale + header/sidebar | grid/ = warianty
 *          renderowania day/3-day/week/month/agenda (patrz CalendarGrid) | context/ = CalendarContext
 * @composes CalendarGrid (renderowanie siatki, patrz grid/)
 * @usedBy Dashboard, WeeklyBalanceHexagon
 */
import { useState, useCallback, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';

import { useCalendarData } from './hooks/useCalendarData';
import { useTimeBudgets } from './hooks/useTimeBudgets';
import { useCalendarTodos } from './hooks/useCalendarTodos';
import { CalendarGrid } from './CalendarGrid';
import { CalendarEventModal } from './CalendarEventModal';
import { CalendarContextMenu, type CalendarContextMenuState } from './CalendarContextMenu';

import { todayStr, type CalRow } from './calendarHelpers';

import { CalendarContext, CalendarContextType } from './context/CalendarContext';
import CalendarSidebar from './components/CalendarSidebar';
import CalendarHeader from './components/CalendarHeader';
import CalendarTodoModal from './components/CalendarTodoModal';
import CalendarBudgetModal from './components/CalendarBudgetModal';
import CalendarShell from './components/CalendarShell';

import { calculateWeeklyTotals } from './calendarView/calendarViewHelpers';
import { useCalendarActions } from './calendarView/hooks/useCalendarActions';
import { useContextMenuActions } from './calendarView/hooks/useContextMenuActions';
import { useCalendarIntegrations } from './calendarView/hooks/useCalendarIntegrations';
import { useCalendarEffects } from './calendarView/hooks/useCalendarEffects';
import { useCalendarKeyboardShortcuts } from './calendarView/hooks/useCalendarKeyboardShortcuts';
import './calendar.css';

interface Props {
  session: Session;
  onBack: () => void;
  onSyncCalendar: () => void;
  onResyncCalendar?: () => Promise<void> | void;
  isSyncing: boolean;
  onNavigateTo?: (dest: string) => void;
}

export default function CalendarView({
  session,
  onBack,
  onSyncCalendar,
  onResyncCalendar,
  isSyncing,
  onNavigateTo,
}: Props) {
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
  useCalendarKeyboardShortcuts({ calData, today });

  const contextValue: CalendarContextType = useMemo(() => ({
    userId,
    accessToken,
    today,
    calData,
    calTodos,
    timeBudgets,
    categoryWeeklyTotals,
    categoryPrevWeeklyTotals,
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
  }), [
    userId, accessToken, today, calData, calTodos, timeBudgets,
    categoryWeeklyTotals, categoryPrevWeeklyTotals, isSyncing,
    integrations.isSyncingOura, integrations.isSyncingActivities,
    integrations.syncOura, integrations.syncActivities,
    onSyncCalendar,
    actions.handleQuickSave, actions.handleEditSave, actions.closeEditTodoModal,
    actions.saveTodoTitle, actions.saveTodoChanges, actions.handleDeleteTodo,
  ]);

  return (
    <CalendarContext.Provider value={contextValue}>
      <CalendarShell
        sidebarCollapsed={calData.sidebarCollapsed}
        onToggleCollapse={calData.toggleSidebar}
        onNavigateTo={onNavigateTo}
        onQuickCreate={() => calData.setQuickCreate({ date: calData.selectedDay, startMin: 540 })}
        toastMessage={calData.toastMessage}
        sidebar={
          <CalendarSidebar
            onBack={onBack}
            onNavigateTo={onNavigateTo}
            collapsed={calData.sidebarCollapsed}
            onToggleCollapse={calData.toggleSidebar}
          />
        }
      >
        <CalendarHeader onBack={onBack} />
        <CalendarGrid
          calData={calData}
          userId={userId}
          onSyncCalendar={onSyncCalendar}
          isSyncing={isSyncing}
          handleToggleTodo={calTodos.handleToggleTodo}
          completedTodoIds={calTodos.completedTodoIds}
          todosForDay={calTodos.todosForDay}
          goalChipFor={calTodos.goalChipFor}
          scheduleTodoAt={calTodos.scheduleTodoAt}
          handleEventContextMenu={handleEventContextMenu}
        />
        <CalendarContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onEdit={(event) => calData.openEditFromPreview(event)}
          onDelete={(event) => {
            void calData.deleteEventWithUndo(event);
          }}
          onChangeCategory={handleContextMenuChangeCategory}
          onMoveToDate={handleContextMenuMoveToDate}
          onDuplicate={handleContextMenuDuplicate}
          today={today}
        />
        <CalendarEventModal
          calData={calData}
          handleQuickSave={actions.handleQuickSave}
          handleEditSave={actions.handleEditSave}
        />
        <CalendarTodoModal />
        <CalendarBudgetModal />
      </CalendarShell>
    </CalendarContext.Provider>
  );
}
