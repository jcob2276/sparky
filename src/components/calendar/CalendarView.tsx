/**
 * @component CalendarView
 * @role Top-level orchestrator widoku kalendarza.
 * @folders hooks/ = fetch+mutacje danych | calendarView/ = logika wydzielona z tego pliku pod limit 300 linii
 *          (actions/integrations/effects) | components/ = modale + header/sidebar | grid/ = warianty
 *          renderowania day/3-day/week/month/agenda (patrz CalendarGrid) | context/ = CalendarContext
 * @composes CalendarGrid (renderowanie siatki, patrz grid/)
 * @usedBy Dashboard, WeeklyBalanceHexagon
 */
import { CalendarGrid } from './CalendarGrid';
import { CalendarEventModal } from './CalendarEventModal';
import { CalendarContextMenu } from './CalendarContextMenu';
import { CalendarContext } from './context/CalendarContext';
import CalendarSidebar from './components/CalendarSidebar';
import CalendarHeader from './components/CalendarHeader';
import CalendarTodoModal from './components/CalendarTodoModal';
import CalendarBudgetModal from './components/CalendarBudgetModal';
import CalendarShell from './components/CalendarShell';
import { useCalendarViewState } from './hooks/useCalendarViewState';
import './calendar.css';

interface Props {
  onBack: () => void;
  onSyncCalendar: () => void;
  onResyncCalendar?: () => Promise<void> | void;
  isSyncing: boolean;
  onNavigateTo?: (dest: string) => void;
}

export default function CalendarView({
  onBack,
  onSyncCalendar,
  onResyncCalendar,
  isSyncing,
  onNavigateTo,
}: Props) {
  const {
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
  } = useCalendarViewState({
    onSyncCalendar,
    onResyncCalendar,
    isSyncing,
  });

  return (
    <CalendarContext.Provider value={contextValue}>
      <CalendarShell
        sidebarCollapsed={calData.sidebarCollapsed}
        onToggleCollapse={calData.toggleSidebar}
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
