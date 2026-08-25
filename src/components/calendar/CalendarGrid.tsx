/**
 * @component CalendarGrid
 * @role Dispatcher renderowania siatki — wybiera day/3-day/week/month/agenda.
 * @composes grid/CalendarDayView, grid/Calendar3DayView, grid/CalendarWeekView, grid/CalendarMonthView, grid/CalendarAgendaView
 * @usedBy CalendarView
 */
import React, { useRef, useEffect, useMemo } from 'react';
import { useCalendarData } from './hooks/useCalendarData';
import {
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
    if (startDay === endDay) {
      add(startDay, event);
    } else {
      const midnight = `${endDay}T00:00:00${getWarsawOffset(event.start_time)}`;
      add(startDay, { ...event, end_time: midnight });
      add(endDay, { ...event, start_time: midnight });
    }
  }
  return grouped;
}

function useInitialGridScroll(gridRef: React.RefObject<HTMLDivElement | null>, calendarView: string) {
  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 7.5 * PX_PER_HOUR;
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
  nowMin: number;
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
    nowMin: p.nowMin,
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
    displayEvents: events, weather, nowMin, setQuickCreate, setQuickDuration,
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

  const today = useMemo(() => todayStr(), []);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
  const getEventsForDay = (day: string) => eventsByDay[day] || [];

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
        nowMin={nowMin}
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


