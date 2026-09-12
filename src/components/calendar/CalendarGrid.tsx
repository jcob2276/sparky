/**
 * @component CalendarGrid
 * @role Dispatcher renderowania siatki — wybiera day/3-day/week/month/agenda.
 * @composes grid/CalendarDayView, grid/Calendar3DayView, grid/CalendarWeekView, grid/CalendarMonthView, grid/CalendarAgendaView
 * @usedBy CalendarView
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCalendarData } from './hooks/useCalendarData';
import {
  HOUR_START,
  HOURS,
  PX_PER_HOUR,
  addDays,
  todayStr,
  dateOfISO,
  getWarsawOffset,
} from './calendarHelpers';
import { useCalendarDragSelect } from './grid/useCalendarDragSelect';
import { CalendarDayView } from './grid/CalendarDayView';
import { Calendar3DayView } from './grid/Calendar3DayView';
import { CalendarWeekView } from './grid/CalendarWeekView';
import { CalendarMonthView } from './grid/CalendarMonthView';
import type { CalRow } from './calendarHelpers';
import type { CalendarTodo } from './hooks/useCalendarTodos';
import type { GoalChip } from './grid/types';
import { useCalendarGridSwipe } from './grid/useCalendarGridSwipe';

interface CalendarGridProps {
  calData: ReturnType<typeof useCalendarData>;
  userId: string | undefined;
  onSyncCalendar: () => void;
  isSyncing: boolean;
  handleToggleTodo: (id: string) => void;
  completedTodoIds: Set<string>;
  todosForDay: (day: string) => CalendarTodo[];
  goalChipFor: (sectionId: string | null) => GoalChip;
  scheduleTodoAt: (todo: { id: string }, day: string, startMin: number, duration: number) => Promise<unknown>;
  handleEventContextMenu?: (ev: CalRow, e: React.MouseEvent) => void;
}

function groupEventsByDay(events: CalRow[]): Record<string, CalRow[]> {
  const grouped: Record<string, CalRow[]> = {};
  const add = (day: string, event: CalRow) => {
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(event);
  };
  for (const event of events) {
    if (!event.start_time) continue;
    const startDay = dateOfISO(event.start_time);
    const endDay = event.end_time ? dateOfISO(event.end_time) : startDay;

    // Preserve original times for display (bedtime etc.)
    const evtWithOriginals = {
      ...event,
      original_start_time: event.original_start_time || event.start_time,
      original_end_time: event.original_end_time || event.end_time,
    };

    if (startDay === endDay) {
      add(startDay, evtWithOriginals);
    } else {
      // Iterate through ALL days the event spans (fixes 3+ day events disappearing on middle days)
      const offset = getWarsawOffset(event.start_time);
      let cursor = startDay;
      while (cursor <= endDay) {
        const isFirst = cursor === startDay;
        const isLast = cursor === endDay;
        const dayStart = isFirst ? event.start_time : `${cursor}T00:00:00${offset}`;
        const dayEnd = isLast ? event.end_time : `${addDays(cursor, 1)}T00:00:00${offset}`;
        add(cursor, { ...evtWithOriginals, start_time: dayStart, end_time: dayEnd ?? null });
        cursor = addDays(cursor, 1);
      }
    }
  }
  return grouped;
}

function useInitialGridScroll(gridRef: React.RefObject<HTMLDivElement | null>, calendarView: string) {
  useEffect(() => {
    if (!gridRef.current) return;
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const targetHour = Math.max(0, currentHour - HOUR_START - 1.5);
    const scrollTarget = Math.max(0, Math.min(HOURS * PX_PER_HOUR, targetHour * PX_PER_HOUR));
    gridRef.current.scrollTop = scrollTarget;
  }, [calendarView, gridRef]);
}

type GridViewProps = {
  calView: ReturnType<typeof useCalendarData>['calView'];
  selectedDay: string;
  setSelectedDay: (day: string) => void;
  weekStart: string;
  setWeekStart: (start: string) => void;
  setCalView: ReturnType<typeof useCalendarData>['setCalView'];
  weather: ReturnType<typeof useCalendarData>['weather'];
  today: string;
  weekDays: string[];
  dragSelect: ReturnType<typeof useCalendarDragSelect>['dragSelect'];
  goalChipFor: (sectionId: string | null) => GoalChip;
  completedTodoIds: Set<string>;
  getEventsForDay: (day: string) => CalRow[];
  todosForDay: (day: string) => CalendarTodo[];
  handleColumnMouseDown: (day: string, e: React.MouseEvent) => void;
  handleColumnMouseMove: (day: string, e: React.MouseEvent) => void;
  handleColumnClick: (day: string, e: React.MouseEvent) => void;
  handleEventMouseDown: ReturnType<typeof useCalendarData>['handleEventMouseDown'];
  handleEventContextMenu?: (ev: CalRow, e: React.MouseEvent) => void;
  handleToggleTodo: (id: string) => void;
  setEditingTodo: ReturnType<typeof useCalendarData>['setEditingTodo'];
  setEditingTodoTitle: ReturnType<typeof useCalendarData>['setEditingTodoTitle'];
  setToastMessage: ReturnType<typeof useCalendarData>['setToastMessage'];
  setSaving: ReturnType<typeof useCalendarData>['setSaving'];
  scheduleTodoAt: (todo: { id: string }, day: string, startMin: number, duration: number) => Promise<unknown>;
  handleEventClick: (ev: CalRow) => void;
  setQuickCreate: ReturnType<typeof useCalendarData>['setQuickCreate'];
  gridRef: React.RefObject<HTMLDivElement | null>;
};

function CalendarGridViews(p: GridViewProps) {
  const column = {
    today: p.today,
    setCalView: p.setCalView,
    dragSelect: p.dragSelect,
    goalChipFor: p.goalChipFor,
    completedTodoIds: p.completedTodoIds,
    getEventsForDay: p.getEventsForDay,
    todosForDay: p.todosForDay,
    handleColumnMouseDown: p.handleColumnMouseDown,
    handleColumnMouseMove: p.handleColumnMouseMove,
    handleColumnClick: p.handleColumnClick,
    handleEventMouseDown: p.handleEventMouseDown,
    handleEventContextMenu: p.handleEventContextMenu,
    handleToggleTodo: p.handleToggleTodo,
    setEditingTodo: p.setEditingTodo,
    setEditingTodoTitle: p.setEditingTodoTitle,
    setToastMessage: p.setToastMessage,
    setSaving: p.setSaving,
    scheduleTodoAt: p.scheduleTodoAt,
    handleEventClick: p.handleEventClick,
    gridRef: p.gridRef,
  };

  if (p.calView === 'dzien') {
    return (
      <CalendarDayView
        selectedDay={p.selectedDay}
        setSelectedDay={p.setSelectedDay}
        setWeekStart={p.setWeekStart}
        weather={p.weather}
        {...column}
      />
    );
  }
  if (p.calView === '3dni') {
    return (
      <Calendar3DayView
        selectedDay={p.selectedDay}
        setSelectedDay={p.setSelectedDay}
        setWeekStart={p.setWeekStart}
        weather={p.weather}
        {...column}
      />
    );
  }
  if (p.calView === 'tydzien') {
    return (
      <CalendarWeekView
        weekStart={p.weekStart}
        setWeekStart={p.setWeekStart}
        setSelectedDay={p.setSelectedDay}
        weather={p.weather}
        weekDays={p.weekDays}
        {...column}
      />
    );
  }
  return (
    <CalendarMonthView
      selectedDay={p.selectedDay}
      setSelectedDay={p.setSelectedDay}
      setCalView={p.setCalView}
      getEventsForDay={p.getEventsForDay}
      todosForDay={p.todosForDay}
      handleEventClick={p.handleEventClick}
      setQuickCreate={p.setQuickCreate}
      today={p.today}
    />
  );
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  calData,
  handleToggleTodo,
  completedTodoIds,
  todosForDay,
  goalChipFor,
  scheduleTodoAt,
  handleEventContextMenu,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const {
    calView, setCalView, selectedDay, setSelectedDay, weekStart, setWeekStart,
    displayEvents: events, weather, setQuickCreate, setQuickDuration,
    setEditingTodo, setEditingTodoTitle, setToastMessage, setSaving,
    handleEventMouseDown, handleEventClick,
  } = calData;

  const { onTouchStart, onTouchEnd, consumeSwipe } = useCalendarGridSwipe({
    calView, selectedDay, weekStart, setSelectedDay, setWeekStart,
  });
  const { dragSelect, handleColumnMouseDown, handleColumnMouseMove, handleColumnClick } = useCalendarDragSelect({
    setQuickDuration, setQuickCreate, consumeSwipe,
  });
  useInitialGridScroll(gridRef, calView);

  // today refreshes at midnight so the "current day" highlight doesn't go stale
  const [today, setToday] = useState(() => todayStr());
  useEffect(() => {
    const now = new Date();
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const t = setTimeout(() => {
      setToday(todayStr());
    }, msToMidnight + 1000);
    return () => clearTimeout(t);
  }, [today]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
  const getEventsForDay = useCallback((day: string) => eventsByDay[day] ?? [], [eventsByDay]);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <CalendarGridViews
        calView={calView}
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
        weekStart={weekStart}
        setWeekStart={setWeekStart}
        setCalView={setCalView}
        weather={weather}
        today={today}
        weekDays={weekDays}
        dragSelect={dragSelect}
        goalChipFor={goalChipFor}
        completedTodoIds={completedTodoIds}
        getEventsForDay={getEventsForDay}
        todosForDay={todosForDay}
        handleColumnMouseDown={handleColumnMouseDown}
        handleColumnMouseMove={handleColumnMouseMove}
        handleColumnClick={handleColumnClick}
        handleEventMouseDown={handleEventMouseDown}
        handleEventContextMenu={handleEventContextMenu}
        handleToggleTodo={handleToggleTodo}
        setEditingTodo={setEditingTodo}
        setEditingTodoTitle={setEditingTodoTitle}
        setToastMessage={setToastMessage}
        setSaving={setSaving}
        scheduleTodoAt={scheduleTodoAt}
        handleEventClick={handleEventClick}
        setQuickCreate={setQuickCreate}
        gridRef={gridRef}
      />
    </div>
  );
};


