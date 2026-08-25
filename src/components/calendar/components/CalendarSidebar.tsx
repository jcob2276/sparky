import { useMemo } from 'react';
import { useCalendar } from '../context/CalendarContext';
import MiniCalendar from '../MiniCalendar';
import SolarDayWidget from '../SolarDayWidget';
import CalendarBudgetPanel from '../CalendarBudgetPanel';
import CalendarSidebarTodos from '../CalendarSidebarTodos';
import { LIFE_SPHERES } from '../../../lib/projects/lifeSpheres';
import { weekMon } from '../calendarHelpers';
import WorkspaceNavigation from '../../shared/WorkspaceNavigation';
import WorkspaceSidebar from '../../shared/WorkspaceSidebar';
import { useSidebar } from '../../ui/sidebar';

interface CalendarSidebarProps {
  onBack: () => void;
  onNavigateTo?: (dest: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function CalendarSidebarBody({
  collapsed,
  onNavigateTo,
}: {
  collapsed?: boolean;
  onNavigateTo?: (dest: string) => void;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const showPanels = isMobile || !collapsed;

  const {
    calData: {
      selectedDay,
      setSelectedDay,
      setWeekStart,
      events,
      setBudgetMinInputs,
      setBudgetMaxInputs,
      setFrameDaysInputs,
      setFrameStartInputs,
      setFrameEndInputs,
      setFrameStrengthInputs,
      setShowBudgetConfig,
    },
    calTodos: {
      inboxTodos,
      newTodoTitle,
      setNewTodoTitle,
      handleQuickAddTodo,
      handleToggleTodo,
      completedTodoIds,
      goalChipFor,
    },
    timeBudgets: {
      budgets,
    },
    categoryWeeklyTotals,
    categoryPrevWeeklyTotals,
  } = useCalendar();

  const eventDatesSet = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      if (ev.start_time) {
        set.add(ev.start_time.split('T')[0]);
      }
    }
    return set;
  }, [events]);

  return (
    <div className={`flex-1 overflow-y-auto ${collapsed && !isMobile ? 'px-1 py-2 space-y-4' : 'px-4 pb-4 space-y-6'}`}>
      {!isMobile && <WorkspaceNavigation active="kalendarz" onNavigate={onNavigateTo} />}

      {showPanels && (
        <>
          <MiniCalendar
            selectedDay={selectedDay}
            eventDatesSet={eventDatesSet}
            onSelectDay={(day) => {
              setSelectedDay(day);
              setWeekStart(weekMon(day));
              if (isMobile) setOpenMobile(false);
            }}
          />

          <SolarDayWidget dateStr={selectedDay} />

          <CalendarBudgetPanel
            categoryWeeklyTotals={categoryWeeklyTotals}
            categoryPrevWeeklyTotals={categoryPrevWeeklyTotals}
            budgets={budgets}
            isMobile={isMobile}
            onConfigure={() => {
              const mins: Record<string, string> = {};
              const maxs: Record<string, string> = {};
              const days: Record<string, number[]> = {};
              const starts: Record<string, string> = {};
              const ends: Record<string, string> = {};
              const strengths: Record<string, 'prefer' | 'only'> = {};
              LIFE_SPHERES.map((s) => s.id).forEach((cat) => {
                const b = budgets.find((item) => item.category === cat);
                mins[cat] = b?.min_hours !== null && b?.min_hours !== undefined ? String(b.min_hours) : '';
                maxs[cat] = b?.max_hours !== null && b?.max_hours !== undefined ? String(b.max_hours) : '';
                days[cat] = b?.preferred_days || [];
                starts[cat] = b?.preferred_start?.slice(0, 5) || '';
                ends[cat] = b?.preferred_end?.slice(0, 5) || '';
                strengths[cat] = b?.frame_strength === 'only' ? 'only' : 'prefer';
              });
              setBudgetMinInputs(mins);
              setBudgetMaxInputs(maxs);
              setFrameDaysInputs(days);
              setFrameStartInputs(starts);
              setFrameEndInputs(ends);
              setFrameStrengthInputs(strengths);
              setShowBudgetConfig(true);
            }}
          />

          <CalendarSidebarTodos
            sidebarTodos={inboxTodos}
            newTodoTitle={newTodoTitle}
            setNewTodoTitle={setNewTodoTitle}
            handleQuickAddTodo={handleQuickAddTodo}
            handleToggleTodo={handleToggleTodo}
            completedTodoIds={completedTodoIds}
            goalChipFor={goalChipFor}
          />
        </>
      )}
    </div>
  );
}

export default function CalendarSidebar({ onBack: _onBack, onNavigateTo, collapsed, onToggleCollapse }: CalendarSidebarProps) {
  return (
    <WorkspaceSidebar
      className="select-none"
      collapsed={collapsed}
      onCollapse={onToggleCollapse}
      provideContext={false}
    >
      <CalendarSidebarBody collapsed={collapsed} onNavigateTo={onNavigateTo} />
    </WorkspaceSidebar>
  );
}
