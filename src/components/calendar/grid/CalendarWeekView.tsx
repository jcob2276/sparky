import { Pressable } from '../../ui/ControlPrimitives';
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HOURS, PX_PER_HOUR, dayLabel, addDays, weekMon, formatWeekdayShort, getISOWeekNumber } from '../calendarHelpers';
import { WMO_WEATHER_DESC, getWMOWeatherIcon } from '../CalendarWeather';
import { renderTimeGutter, renderDayColumn, renderAllDayTodos } from './CalendarGridColumns';
import { AllDayStrip } from './AllDayStrip';
import type { CalRow } from '../calendarHelpers';
import type { CalendarTodo } from '../hooks/useCalendarTodos';
import type { WeatherState } from '../hooks/useCalendarWeather';
import type { GoalChip } from './types';
import { useWeekDayScores } from '../hooks/useWeekDayScores';

interface CalendarWeekViewProps {
  weekStart: string;
  setWeekStart: (start: string) => void;
  setSelectedDay: (day: string) => void;
  setCalView: (view: 'dzien' | '3dni' | 'tydzien' | 'miesiac') => void;
  weather: WeatherState | null | undefined;
  today: string;
  weekDays: string[];
  dragSelect: { day: string; startMin: number; currentMin: number } | null;
  goalChipFor: (sectionId: string | null) => GoalChip;
  completedTodoIds: Set<string>;
  getEventsForDay: (day: string) => CalRow[];
  todosForDay: (day: string) => CalendarTodo[];
  handleColumnMouseDown: (day: string, e: React.MouseEvent) => void;
  handleColumnMouseMove: (day: string, e: React.MouseEvent) => void;
  handleColumnClick?: (day: string, e: React.MouseEvent) => void;
  handleEventMouseDown: (ev: CalRow, e: React.MouseEvent<HTMLDivElement>, action: 'move' | 'resize') => void;
  handleEventContextMenu?: (ev: CalRow, e: React.MouseEvent) => void;
  handleToggleTodo: (id: string) => void;
  setEditingTodo: (todo: CalendarTodo | null) => void;
  setEditingTodoTitle: (title: string) => void;
  setToastMessage: (msg: string) => void;
  setSaving: (saving: boolean) => void;
  scheduleTodoAt: (todo: { id: string }, day: string, startMin: number, duration: number) => Promise<unknown>;
  handleEventClick?: (ev: CalRow) => void;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

interface CalendarWeekPeriodHeaderProps {
  weekStart: string;
  currentWeekNumber: number;
  avgScore: string | null;
  scoredDaysCount: number;
  showCurrentWeekBtn: boolean;
  onMoveWeek: (offset: number) => void;
  onGoToToday: () => void;
}

function CalendarWeekPeriodHeader({
  weekStart,
  currentWeekNumber,
  avgScore,
  scoredDaysCount,
  showCurrentWeekBtn,
  onMoveWeek,
  onGoToToday,
}: CalendarWeekPeriodHeaderProps) {
  return (
    <div className="calendar-period-header flex items-center justify-between border-b border-border-custom/25 px-4 py-1.5 select-none bg-surface-solid/10 backdrop-blur-xs">
      <Pressable onClick={() => onMoveWeek(-7)} className="rounded-full p-2 min-h-9 min-w-9 hover:bg-surface-solid active:scale-[0.96] transition-[transform,background-color] duration-150" aria-label="Poprzedni tydzień">
        <ChevronLeft size={16} className="text-text-muted" />
      </Pressable>
      <div className="text-center flex items-center gap-2 min-w-0 px-1">
        <span className="text-xs sm:text-sm font-semibold text-text-primary truncate">{dayLabel(weekStart)} – {dayLabel(addDays(weekStart, 6))}</span>
        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-3xs border border-primary/25 shrink-0">
          Tydz. {currentWeekNumber}
        </span>
        {avgScore && (
          <span
            className="px-2 py-0.5 rounded-full bg-surface-solid/80 text-text-primary font-semibold text-3xs border border-border-custom/40 flex items-center gap-1 shrink-0"
            title={`Średnia ocena tygodnia (${scoredDaysCount} dni z oceną): ${avgScore}/10`}
          >
            <span className="text-warning text-3xs">★</span> {avgScore}
          </span>
        )}
        {showCurrentWeekBtn && (
          <Pressable onClick={onGoToToday} className="text-2xs font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/15 active:scale-[0.96] ui-interactive shrink-0">
            Dziś
          </Pressable>
        )}
      </div>
      <Pressable onClick={() => onMoveWeek(7)} className="rounded-full p-2 min-h-9 min-w-9 hover:bg-surface-solid active:scale-[0.96] transition-[transform,background-color] duration-150" aria-label="Następny tydzień">
        <ChevronRight size={16} className="text-text-muted" />
      </Pressable>
    </div>
  );
}

interface WeekDayHeaderCellProps {
  day: string;
  isToday: boolean;
  forecast?: { weatherCode: number; tempMax: number; tempMin: number };
  score: number | null;
  totalTodos: number;
  completedTodos: number;
  onOpenDay: (day: string) => void;
}

function WeekDayHeaderCell({
  day,
  isToday,
  forecast,
  score,
  totalTodos,
  completedTodos,
  onOpenDay,
}: WeekDayHeaderCellProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      title="Otwórz dzień"
      onClick={() => onOpenDay(day)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDay(day);
        }
      }}
      className="calendar-week-column group flex flex-col items-center justify-center py-2 text-center cursor-pointer rounded-xl hover:bg-surface-solid/40 active:scale-[0.98] transition-[transform,background-color] duration-150 ease-out"
    >
      <p className={`text-2xs font-semibold tracking-wider uppercase ${isToday ? 'text-primary font-bold' : 'text-text-muted'}`}>
        {formatWeekdayShort(day)}
      </p>
      {forecast && (
        <div className="mt-0.5 hidden items-center gap-1 md:flex" title={`${WMO_WEATHER_DESC[forecast.weatherCode]}: ${forecast.tempMax}°C / ${forecast.tempMin}°C`}>
          {getWMOWeatherIcon(forecast.weatherCode, 11)}
          <span className="text-3xs font-medium text-text-muted">{forecast.tempMax}°</span>
        </div>
      )}
      <span className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ui-interactive ${isToday ? 'bg-primary text-on-accent shadow-xs' : 'text-text-primary group-hover:bg-surface-solid'}`}>
        {parseInt(day.split('-')[2])}
      </span>
      {score != null && (
        <span
          title={`Ocena dnia: ${score}/10`}
          className={`mt-1 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-3xs font-bold tabular-nums border ${
            score >= 8
              ? 'bg-success/15 text-success border-success/40'
              : score >= 5
              ? 'bg-warning/15 text-warning border-warning/40'
              : 'bg-danger/15 text-danger border-danger/40'
          }`}
        >
          ★ {score}
        </span>
      )}
      {totalTodos > 0 && (
        <span
          title={`Wykonano zadania: ${completedTodos}/${totalTodos}`}
          className={`mt-0.5 hidden md:inline-flex items-center justify-center text-3xs font-medium tabular-nums ${
            completedTodos === totalTodos ? 'text-success' : 'text-text-muted/75'
          }`}
        >
          ✓ {completedTodos}/{totalTodos}
        </span>
      )}
    </div>
  );
}

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  weekStart, setWeekStart, setSelectedDay, setCalView, weather, today, weekDays, dragSelect,
  goalChipFor, completedTodoIds, getEventsForDay, todosForDay, handleColumnMouseDown,
  handleColumnMouseMove, handleColumnClick, handleEventMouseDown, handleEventContextMenu, handleToggleTodo,
  setEditingTodo, setEditingTodoTitle, setToastMessage, setSaving, scheduleTodoAt, handleEventClick, gridRef,
}) => {
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const untimedByDay = weekDays.map(day => todosForDay(day).filter(todo => !todo.scheduled_time));
  const allDayByDay = weekDays.map(day => getEventsForDay(day).filter(ev => ev.is_all_day));
  const dayScores = useWeekDayScores(weekDays);
  const scoredDays = Object.values(dayScores).filter((s): s is number => s !== null && s > 0);
  const avgScore = scoredDays.length ? (scoredDays.reduce((a, b) => a + b, 0) / scoredDays.length).toFixed(1) : null;

  const moveWeek = (offset: number) => {
    const week = addDays(weekStart, offset);
    setWeekStart(week);
    setSelectedDay(week);
  };

  const handleOpenDay = (day: string) => {
    setSelectedDay(day);
    setCalView('dzien');
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <CalendarWeekPeriodHeader
        weekStart={weekStart}
        currentWeekNumber={getISOWeekNumber(weekStart)}
        avgScore={avgScore}
        scoredDaysCount={scoredDays.length}
        showCurrentWeekBtn={!weekDays.includes(today)}
        onMoveWeek={moveWeek}
        onGoToToday={() => {
          const week = weekMon(today);
          setWeekStart(week);
          setSelectedDay(today);
        }}
      />

      <div
        ref={topScrollRef}
        className="calendar-week-top-scroll shrink-0 overflow-x-auto"
        onScroll={event => {
          if (gridRef.current) gridRef.current.scrollLeft = event.currentTarget.scrollLeft;
        }}
      >
        <div className="calendar-week-canvas">
          <div className="calendar-week-strip flex border-b border-border-custom/70 pl-11">
            {weekDays.map(day => {
              const dayTodoList = todosForDay(day);
              const completedTodos = dayTodoList.filter(t => t.status === 'done' || completedTodoIds.has(t.id)).length;
              return (
                <WeekDayHeaderCell
                  key={day}
                  day={day}
                  isToday={day === today}
                  forecast={weather?.daily?.[day]}
                  score={dayScores[day]}
                  totalTodos={dayTodoList.length}
                  completedTodos={completedTodos}
                  onOpenDay={handleOpenDay}
                />
              );
            })}
          </div>
          <AllDayStrip
            days={weekDays}
            allDayByDay={allDayByDay}
            gutterWidth={44}
            onEventClick={(ev) => handleEventClick?.(ev)}
          />
          {renderAllDayTodos({
            days: weekDays, untimedByDay, goalChipFor, completedTodoIds, handleToggleTodo,
            setEditingTodo, setEditingTodoTitle, setToastMessage,
          })}
        </div>
      </div>

      <div
        ref={gridRef}
        className="calendar-week-grid flex-1 overflow-auto"
        onScroll={event => {
          if (topScrollRef.current) topScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
        }}
      >
        <div className="calendar-week-canvas flex pt-3" style={{ minHeight: HOURS * PX_PER_HOUR + 40 }}>
          <div className="calendar-week-time-gutter sticky left-0 z-[var(--z-sticky)] bg-background">
            {renderTimeGutter({ dayKey: undefined, weather: undefined })}
          </div>
          {weekDays.map(day => (
            <div key={day} data-day-col={day} className={`calendar-week-column relative border-l border-border-custom/50 ${day === today ? 'bg-primary/[0.03]' : ''}`}>
              {renderDayColumn({
                day, today, dayEvents: getEventsForDay(day).filter(ev => !ev.is_all_day),
                dayTodos: todosForDay(day).filter(todo => todo.scheduled_time), dragSelect,
                goalChipFor, completedTodoIds, handleColumnMouseDown, handleColumnMouseMove,
                handleColumnClick, handleEventMouseDown, handleEventContextMenu, handleEventClick, handleToggleTodo, setEditingTodo, setEditingTodoTitle,
                setToastMessage, setSaving, scheduleTodoAt,
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
