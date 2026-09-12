import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../../ui/Button';
import {
  HOURS,
  PX_PER_HOUR,
  monthLabel,
  addDays,
  weekMon,
} from '../calendarHelpers';
import { WMO_WEATHER_DESC, getWMOWeatherIcon } from '../CalendarWeather';
import { renderTimeGutter, renderDayColumn, renderAllDayTodos } from './CalendarGridColumns';
import { AllDayStrip } from './AllDayStrip';
import { formatWarsawDate } from '../../../lib/date';
import type { CalRow } from '../calendarHelpers';
import type { CalendarTodo } from '../hooks/useCalendarTodos';
import type { WeatherState } from '../hooks/useCalendarWeather';
import type { GoalChip } from './types';

interface CalendarDayViewProps {
  selectedDay: string;
  setSelectedDay: (day: string) => void;
  setWeekStart: (start: string) => void;
  weather: WeatherState | null | undefined;
  today: string;
  dragSelect: {
    day: string;
    startMin: number;
    currentMin: number;
  } | null;
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

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  selectedDay,
  setSelectedDay,
  setWeekStart,
  weather,
  today,
  dragSelect,
  goalChipFor,
  completedTodoIds,
  getEventsForDay,
  todosForDay,
  handleColumnMouseDown,
  handleColumnMouseMove,
  handleColumnClick,
  handleEventMouseDown,
  handleEventContextMenu,
  handleToggleTodo,
  setEditingTodo,
  setEditingTodoTitle,
  setToastMessage,
  setSaving,
  scheduleTodoAt,
  handleEventClick,
  gridRef,
}) => {
  const untimedTodos = todosForDay(selectedDay).filter((t) => !t.scheduled_time);
  const allDayEvents = getEventsForDay(selectedDay).filter((ev) => ev.is_all_day);
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatWarsawDate(d);
  })();
  const showHourlyWeather = selectedDay === today || selectedDay === tomorrow;
  const gutterWidth = showHourlyWeather ? 72 : 44;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="calendar-period-header flex items-center justify-between px-4 py-1.5 border-b border-border-custom/20 select-none bg-surface-solid/10 backdrop-blur-xs">
        <Button
          variant="ghost"
          onClick={() => {
            const d = addDays(selectedDay, -1);
            setSelectedDay(d);
            setWeekStart(weekMon(d));
          }}
          icon={<ChevronLeft size={16} className="text-text-muted" />}
          aria-label="Poprzedni dzień"
          className="min-h-9 min-w-9 p-2 rounded-full hover:bg-surface-solid active:scale-[0.96] transition-[transform,background-color] duration-150"
        />
        <div className="text-center flex flex-col items-center">
          <p className="text-sm font-semibold text-text-primary">{monthLabel(selectedDay)}</p>
          {weather?.daily?.[selectedDay] && (
            <div className="flex items-center gap-1 mt-0.5 text-xs font-medium text-text-muted cursor-help" title={WMO_WEATHER_DESC[weather.daily[selectedDay].weatherCode]}>
              {getWMOWeatherIcon(weather.daily[selectedDay].weatherCode, 12)}
              <span>{weather.daily[selectedDay].tempMax}°C / {weather.daily[selectedDay].tempMin}°C</span>
            </div>
          )}
          {selectedDay !== today && (
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedDay(today);
                setWeekStart(weekMon(today));
              }}
              className="text-2xs text-primary font-semibold mt-0.5 px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/15 active:scale-[0.96] transition-all"
            >
              Wróć do dziś
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            const d = addDays(selectedDay, 1);
            setSelectedDay(d);
            setWeekStart(weekMon(d));
          }}
          icon={<ChevronRight size={16} className="text-text-muted" />}
          aria-label="Następny dzień"
          className="min-h-9 min-w-9 p-2 rounded-full hover:bg-surface-solid active:scale-[0.96] transition-[transform,background-color] duration-150"
        />
      </div>
      <AllDayStrip
        days={[selectedDay]}
        allDayByDay={[allDayEvents]}
        gutterWidth={gutterWidth}
        onEventClick={(ev) => handleEventClick?.(ev)}
      />
      {renderAllDayTodos({
        days: [selectedDay],
        untimedByDay: [untimedTodos],
        goalChipFor,
        completedTodoIds,
        handleToggleTodo,
        setEditingTodo,
        setEditingTodoTitle,
        setToastMessage,
      })}
      <div ref={gridRef} className="flex-1 overflow-y-auto">
        <div className="flex pt-3" style={{ minHeight: HOURS * PX_PER_HOUR + 40 }}>
          {renderTimeGutter({ dayKey: selectedDay, weather })}
          <div data-day-col={selectedDay} className="flex-1 relative">
            {renderDayColumn({
              day: selectedDay,
              today,
              dayEvents: getEventsForDay(selectedDay).filter((ev) => !ev.is_all_day),
              dayTodos: todosForDay(selectedDay).filter((t) => t.scheduled_time),
              dragSelect,
              goalChipFor,
              completedTodoIds,
              handleColumnMouseDown,
              handleColumnMouseMove,
              handleColumnClick,
              handleEventMouseDown,
              handleEventContextMenu,
              handleEventClick,
              handleToggleTodo,
              setEditingTodo,
              setEditingTodoTitle,
              setToastMessage,
              setSaving,
              scheduleTodoAt,
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
