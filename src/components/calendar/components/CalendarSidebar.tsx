import { useMemo } from 'react';
import { useCalendar } from '../context/CalendarContext';
import MiniCalendar from '../MiniCalendar';
import SolarDayWidget from '../SolarDayWidget';
import { weekMon } from '../calendarHelpers';
import { formatWarsawDate } from '../../../lib/date';
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
    calData: { selectedDay, setSelectedDay, setWeekStart, events },
  } = useCalendar();

  const eventDatesSet = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      if (ev.start_time) {
        set.add(formatWarsawDate(ev.start_time));
      }
    }
    return set;
  }, [events]);

  return (
    <div className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed && !isMobile ? 'px-1 py-2 space-y-4' : 'px-3 pb-4 space-y-4'}`}>
      <WorkspaceNavigation active="kalendarz" onNavigate={onNavigateTo} className={collapsed && !isMobile ? '' : '-mx-3'} />

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
