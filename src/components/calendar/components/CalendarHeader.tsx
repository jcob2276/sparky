import { useState } from 'react';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import { RefreshCw, Calendar as CalendarIcon, Search, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useCalendar } from '../context/CalendarContext';
import { WorkspaceHeader } from '../../shared/WorkspaceHeader';
import { weekMon } from '../calendarHelpers';
import { shiftPeriodDates } from '../calendarView/calendarViewHelpers';
import { formatRangeLabel } from '../calendarRangeLabel';
import { SidebarTrigger } from '../../ui/sidebar';

const CALENDAR_TABS = [
  { key: 'dzien', label: 'Dzień', mobileLabel: 'Dzień' },
  { key: '3dni', label: '3 Dni', mobileLabel: '3D' },
  { key: 'tydzien', label: 'Tydzień', mobileLabel: 'Tydz.' },
  { key: 'miesiac', label: 'Miesiąc', mobileLabel: 'Mc' },
];

interface CalendarHeaderProps {
  onBack: () => void;
}

export default function CalendarHeader({ onBack }: CalendarHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const {
    today,
    calData: {
      calView,
      setCalView,
      selectedDay,
      setSelectedDay,
      weekStart,
      setWeekStart,
      searchQuery,
      setSearchQuery,
      setQuickCreate,
    },
    isSyncing,
    onSyncCalendar,
  } = useCalendar();

  const handleTodayClick = () => {
    setSelectedDay(today);
    setWeekStart(weekMon(today));
  };

  const handleMovePeriod = (direction: -1 | 1) => {
    const { nextSelectedDay, nextWeekStart } = shiftPeriodDates(
      calView,
      selectedDay,
      weekStart,
      direction,
    );
    setSelectedDay(nextSelectedDay);
    setWeekStart(nextWeekStart);
  };

  const tabs = CALENDAR_TABS.map((tab) => ({
    key: tab.key,
    label: (
      <>
        <span className="md:hidden">{tab.mobileLabel}</span>
        <span className="hidden md:inline">{tab.label}</span>
      </>
    ),
  }));

  return (
    <WorkspaceHeader
      title={
        <>
          <span className="md:hidden">{formatRangeLabel(calView, selectedDay, weekStart, true)}</span>
          <span className="hidden md:inline">{formatRangeLabel(calView, selectedDay, weekStart)}</span>
        </>
      }
      onBack={onBack}
      leading={
        <SidebarTrigger className="min-h-11 min-w-11 md:hidden shrink-0" aria-label="Otwórz panel kalendarza" />
      }
      actions={
        <div className="flex items-center gap-1.5 sm:gap-2">
          {searchOpen ? (
            <div className="relative flex items-center">
              <Search size={14} className="pointer-events-none absolute left-2.5 text-text-muted" />
              <ControlInput
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj…"
                className="h-11 w-[min(52vw,14rem)] rounded-lg border border-border-custom/40 bg-surface-solid/30 pl-8 pr-8 text-base text-text-primary placeholder:text-text-muted/60 focus:border-primary focus:bg-background focus:outline-none sm:h-9 sm:w-48 sm:text-xs"
              />
              <Pressable
                onClick={() => {
                  setSearchQuery('');
                  setSearchOpen(false);
                }}
                className="absolute right-1 min-h-9 min-w-9 text-text-muted hover:text-text-primary"
                aria-label="Zamknij wyszukiwanie"
              >
                <X size={14} />
              </Pressable>
            </div>
          ) : (
            <Pressable
              onClick={() => setSearchOpen(true)}
              variant="secondary"
              size="sm"
              className="calendar-icon-action h-11 w-11 shrink-0 !p-0 sm:h-9 sm:w-9"
              aria-label="Szukaj wydarzeń"
              icon={<Search size={14} />}
            />
          )}

          <div className={`hidden sm:flex items-center rounded-lg border border-border-custom/30 bg-surface-1/40 p-0.5 ${searchOpen ? 'sm:hidden' : ''}`}>
            <Pressable
              onClick={() => handleMovePeriod(-1)}
              aria-label="Poprzedni okres"
              title="Poprzedni okres (← / J)"
              className="h-8 w-8 rounded-md hover:bg-surface-2 active:scale-90 flex items-center justify-center text-text-muted hover:text-text-primary ui-interactive"
            >
              <ChevronLeft size={16} />
            </Pressable>
            <Pressable
              onClick={() => handleMovePeriod(1)}
              aria-label="Następny okres"
              title="Następny okres (→ / K)"
              className="h-8 w-8 rounded-md hover:bg-surface-2 active:scale-90 flex items-center justify-center text-text-muted hover:text-text-primary ui-interactive"
            >
              <ChevronRight size={16} />
            </Pressable>
          </div>

          <Pressable
            onClick={handleTodayClick}
            variant="secondary"
            size="sm"
            icon={<CalendarIcon size={14} />}
            className={`calendar-today-button h-11 w-11 shrink-0 font-bold text-xs sm:h-9 sm:w-auto sm:px-3.5 ${searchOpen ? 'max-sm:hidden' : ''}`}
            aria-label="Dzisiaj"
            title="Przejdź do dzisiaj (T)"
          >
            <span className="hidden sm:inline">Dzisiaj</span>
          </Pressable>
          <Pressable
            onClick={onSyncCalendar}
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />}
            className={`calendar-sync-button h-11 w-11 shrink-0 sm:h-9 md:w-auto md:px-3.5 ${searchOpen ? 'max-sm:hidden' : ''}`}
            aria-label={isSyncing ? 'Synchronizuję' : 'Synchronizuj'}
            title="Synchronizuj z Google Calendar"
          >
            <span className="hidden md:inline">{isSyncing ? 'Synchronizuję…' : 'Sync'}</span>
          </Pressable>
          <Pressable
            onClick={() => setQuickCreate({ date: selectedDay, startMin: 540 })}
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            className={`h-9 px-3.5 rounded-xl font-bold text-xs max-md:hidden bg-primary text-on-accent shadow-xs hover:bg-primary-hover active:scale-95 ui-interactive ${searchOpen ? 'max-lg:hidden' : ''}`}
            aria-label="Dodaj nowe wydarzenie"
            title="Dodaj nowe wydarzenie (C)"
          >
            <span>Nowe</span>
          </Pressable>
        </div>
      }
      tabs={{
        items: tabs,
        active: calView,
        onChange: (key) => setCalView(key as typeof calView),
      }}
    />
  );
}
