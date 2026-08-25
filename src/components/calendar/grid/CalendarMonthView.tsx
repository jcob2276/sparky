import { Pressable } from '../../ui/ControlPrimitives';
import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { getMonthGridDays, eventColor, formatTime } from '../calendarHelpers';
import { formatRangeLabel } from '../calendarRangeLabel';
import type { CalRow } from '../calendarHelpers';
import type { CalendarTodo } from '../hooks/useCalendarTodos';
import { getPolishHolidayForDate } from '../../../lib/holidays';
import { LIFE_SPHERES } from '../../../lib/projects/lifeSpheres';

interface CalendarMonthViewProps {
  selectedDay: string;
  setSelectedDay: (day: string) => void;
  setCalView: (view: 'dzien' | '3dni' | 'tydzien' | 'miesiac') => void;
  getEventsForDay: (day: string) => CalRow[];
  todosForDay: (day: string) => CalendarTodo[];
  handleEventClick: (ev: CalRow) => void;
  setQuickCreate: (val: { date: string; startMin: number } | null) => void;
  today: string;
}

const WEEKDAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

function categoryDotClass(category: string): string {
  const normalized = category.replace('ciało_', 'cialo_');
  const sphere = LIFE_SPHERES.find((s) => s.id === normalized);
  return sphere?.dot ?? 'bg-primary';
}

function CategoryDots({ categories, className }: { categories: string[]; className?: string }) {
  if (categories.length === 0) return null;
  return (
    <div className={className}>
      {categories.map((cat) => (
        <span key={cat} className={`h-1.5 w-1.5 rounded-full ${categoryDotClass(cat)}`} />
      ))}
    </div>
  );
}

interface MonthDayCellProps {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  dayEvents: CalRow[];
  dayTodos: CalendarTodo[];
  onOpenDay: (dateStr: string) => void;
  onQuickCreate: (dateStr: string) => void;
  onEventClick: (ev: CalRow) => void;
}

function MonthDayCell({
  dateStr,
  dayNumber,
  isCurrentMonth,
  isToday,
  isSelected,
  dayEvents,
  dayTodos,
  onOpenDay,
  onQuickCreate,
  onEventClick,
}: MonthDayCellProps) {
  const holiday = getPolishHolidayForDate(dateStr);
  const maxVisible = holiday ? 2 : 3;
  const overflowCount = Math.max(0, dayEvents.length + dayTodos.length - maxVisible);
  const categories = Array.from(new Set(dayEvents.map((e) => e.category || 'default'))).slice(0, 3);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDay(dateStr)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDay(dateStr);
        }
      }}
      className={`calendar-month-cell group relative flex min-h-[var(--ds-h-90px)] cursor-pointer flex-col p-1.5 transition-colors hover:bg-surface-solid/40 ${
        !isCurrentMonth ? 'bg-surface-solid/10 text-text-muted/40' : ''
      } ${isToday ? 'bg-primary/[0.04]' : ''} ${isSelected ? 'ring-1 ring-inset ring-primary/40' : ''}`}
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition-transform ${
              isToday
                ? 'bg-primary text-on-accent shadow-md scale-105'
                : isCurrentMonth
                  ? 'text-text-primary'
                  : 'text-text-muted/40'
            }`}
          >
            {dayNumber}
          </span>

          {(dayEvents.length > 0 || dayTodos.length > 0) && (
            <div className="calendar-month-dots flex items-center gap-0.5 md:hidden">
              {categories.length > 0 ? (
                <CategoryDots categories={categories} className="flex items-center gap-0.5" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />
              )}
              {overflowCount > 0 && categories.length >= 3 && (
                <span className="text-3xs font-bold text-text-muted">+</span>
              )}
            </div>
          )}

          <CategoryDots categories={categories} className="hidden items-center gap-1 md:flex" />
        </div>

        <Pressable
          onClick={(e) => {
            e.stopPropagation();
            onQuickCreate(dateStr);
          }}
          className="hidden min-h-9 min-w-9 rounded-full p-1.5 text-text-muted opacity-100 transition-opacity hover:bg-surface-solid md:flex md:opacity-0 md:group-hover:opacity-100"
          title="Dodaj wydarzenie"
          aria-label={`Dodaj wydarzenie ${dateStr}`}
        >
          <Plus size={12} />
        </Pressable>
      </div>

      {holiday && (
        <div
          className="mb-0.5 shrink-0 truncate rounded border border-warning/20 bg-warning/10 px-1 py-0.5 text-3xs font-black text-warning select-none"
          title={holiday.name}
        >
          {holiday.name}
        </div>
      )}

      <div className="calendar-month-event-pill flex-1 space-y-1 overflow-hidden md:!block">
        {dayEvents.slice(0, maxVisible).map((ev) => (
          <div
            key={ev.id}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(ev);
            }}
            className={`cursor-pointer truncate rounded px-1.5 py-0.5 text-3xs font-medium transition-transform hover:scale-[var(--scale-hover)] ${eventColor(ev)}`}
            title={`${ev.summary} (${ev.start_time ? formatTime(ev.start_time) : ''})`}
          >
            {ev.start_time && <span className="mr-1 font-bold">{formatTime(ev.start_time)}</span>}
            {ev.summary}
          </div>
        ))}

        {dayEvents.length < maxVisible &&
          dayTodos.slice(0, maxVisible - dayEvents.length).map((todo) => (
            <div
              key={todo.id}
              className="truncate rounded border border-border-custom/50 bg-surface-solid/80 px-1.5 py-0.5 text-3xs font-medium text-text-secondary"
              title={todo.title}
            >
              ✓ {todo.title}
            </div>
          ))}

        {overflowCount > 0 && (
          <Pressable
            onClick={(e) => {
              e.stopPropagation();
              onOpenDay(dateStr);
            }}
            className="w-full pt-0.5 text-left text-3xs font-bold text-primary hover:underline"
          >
            +{overflowCount} więcej…
          </Pressable>
        )}
      </div>
    </div>
  );
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  selectedDay,
  setSelectedDay,
  setCalView,
  getEventsForDay,
  todosForDay,
  handleEventClick,
  setQuickCreate,
  today: _today,
}) => {
  const currentMonthDate = useMemo(() => new Date(selectedDay), [selectedDay]);
  const gridDays = useMemo(() => getMonthGridDays(selectedDay), [selectedDay]);

  const changeMonth = (delta: number) => {
    const d = new Date(currentMonthDate);
    d.setMonth(d.getMonth() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedDay(`${y}-${m}-01`);
  };

  const openDay = (dateStr: string) => {
    setSelectedDay(dateStr);
    setCalView('dzien');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background select-none">
      <div className="calendar-period-header flex items-center justify-between border-b border-border-custom/40 bg-surface-solid/20 px-3 py-2">
        <div className="flex items-center gap-1">
          <Pressable onClick={() => changeMonth(-1)} className="min-h-11 min-w-11 rounded-full p-2 hover:bg-surface-solid" aria-label="Poprzedni miesiąc">
            <ChevronLeft size={18} className="text-text-muted" />
          </Pressable>
          <p className="text-sm font-black uppercase tracking-wider text-text-primary">
            {formatRangeLabel('miesiac', selectedDay, selectedDay)}
          </p>
        </div>
        <Pressable onClick={() => changeMonth(1)} className="min-h-11 min-w-11 rounded-full p-2 hover:bg-surface-solid" aria-label="Następny miesiąc">
          <ChevronRight size={18} className="text-text-muted" />
        </Pressable>
      </div>

      <div className="calendar-month-weekday grid grid-cols-7 border-b border-border-custom/40 bg-surface-solid/30 py-2 text-center text-xs font-black uppercase tracking-wider text-text-muted">
        {WEEKDAY_NAMES.map((name) => (
          <div key={name}>{name}</div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-5 divide-x divide-y divide-border-custom/30 overflow-y-auto md:grid-rows-6">
        {gridDays.map((cell) => (
          <MonthDayCell
            key={cell.dateStr}
            dateStr={cell.dateStr}
            dayNumber={cell.dayNumber}
            isCurrentMonth={cell.isCurrentMonth}
            isToday={cell.isToday}
            isSelected={cell.dateStr === selectedDay}
            dayEvents={getEventsForDay(cell.dateStr)}
            dayTodos={todosForDay(cell.dateStr)}
            onOpenDay={openDay}
            onQuickCreate={(d) => setQuickCreate({ date: d, startMin: 540 })}
            onEventClick={handleEventClick}
          />
        ))}
      </div>
    </div>
  );
};
