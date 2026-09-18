import { getTodayWarsaw, formatWarsawDate } from '../../../lib/date';
import React from 'react';
import {
  HOUR_START,
  HOURS,
  PX_PER_HOUR,
  PX_PER_MIN,
} from '../calendarHelpers';
import { layoutDayEvents } from '../calendarLayout';
import { GOAL_ICON } from '../../todo/todoUtils';
import { getSunTimes, formatTimeWarsaw } from '../../../lib/solar';
import { WMO_WEATHER_DESC, getWMOWeatherIcon } from '../CalendarWeather';
import { renderEventBlock, renderTodoBlock } from './CalendarGridBlocks';
import { NowLine } from './NowLine';
import type {
  CalendarGridTimeGutterProps,
  CalendarGridColumnProps,
  CalendarGridAllDayTodosProps,
} from './types';

export const renderTimeGutter = ({
  dayKey,
  weather,
}: CalendarGridTimeGutterProps) => {
  const today = getTodayWarsaw();
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatWarsawDate(d);
  })();
  const showHourlyWeather = dayKey === today || dayKey === tomorrow;
  const hourlyForDay = showHourlyWeather && weather?.hourly?.[dayKey!] ? weather.hourly[dayKey!] : null;

  const hourlyByHour: Record<number, { hour: number; temp: number; weatherCode: number; precipProb: number }> = {};
  if (hourlyForDay) {
    for (const h of hourlyForDay) {
      hourlyByHour[h.hour] = h;
    }
  }

  const gutterWidthClass = showHourlyWeather ? 'w-11 sm:w-[72px]' : 'w-11';

  return (
    <div className={`flex flex-col shrink-0 relative ${gutterWidthClass}`}>
      {Array.from({ length: HOURS + 1 }, (_, i) => {
        const absoluteHour = HOUR_START + i;
        const hw = hourlyByHour[absoluteHour];
        return (
          <div
            key={i}
            className={`absolute right-0 flex items-center justify-end h-5 -translate-y-1/2 ${gutterWidthClass}`}
            style={{ top: i * PX_PER_HOUR }}
          >
            {hw && showHourlyWeather && (
              <div
                className="hidden sm:flex items-center gap-0.5 mr-1"
                title={`${WMO_WEATHER_DESC[hw.weatherCode]}${hw.precipProb > 0 ? ` · opady ${hw.precipProb}%` : ''}`}
              >
                {getWMOWeatherIcon(hw.weatherCode, 12, absoluteHour < 6 || absoluteHour >= 20)}
                <span className={`text-2xs font-bold leading-none tabular-nums ${hw.precipProb >= 50 ? 'text-info-hover' : 'text-text-primary'}`}>
                  {hw.temp}°
                </span>
              </div>
            )}
            <span className="text-2xs font-semibold text-text-muted/80 text-right pr-2 tabular-nums select-none tracking-tight">
              {String(absoluteHour).padStart(2, '0')}:00
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const renderDayColumn = ({
  day,
  colClass = '',
  today,
  dayEvents,
  dayTodos,
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
}: CalendarGridColumnProps) => {
  const showSelection = dragSelect && dragSelect.day === day;
  const startMin = showSelection ? Math.min(dragSelect!.startMin, dragSelect!.currentMin) : 0;
  const endMin = showSelection ? Math.max(dragSelect!.startMin, dragSelect!.currentMin) : 0;
  const selectionTop = (startMin - HOUR_START * 60) * PX_PER_MIN;
  const selectionHeight = (endMin - startMin) * PX_PER_MIN;

  return (
    <div
      key={day}
      data-day-col={day}
      className={`relative flex-1 min-w-0 ${colClass}`}
      style={{ height: HOURS * PX_PER_HOUR }}
      onMouseDown={(e) => handleColumnMouseDown(day, e)}
      onMouseMove={(e) => handleColumnMouseMove(day, e)}
      onClick={(e) => handleColumnClick?.(day, e)}
      onDragOver={(e) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-primary/5');
      }}
      onDragLeave={(e) => {
        e.currentTarget.classList.remove('bg-primary/5');
      }}
      onDrop={async (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-primary/5');
        const rawData = e.dataTransfer.getData('text/plain');
        if (!rawData) return;
        try {
          const todo = JSON.parse(rawData);
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetY = e.clientY - rect.top;
          const dropMin = Math.round((offsetY / PX_PER_MIN) / 15) * 15 + HOUR_START * 60;

          setSaving(true);
          await scheduleTodoAt(todo, day, dropMin, todo.duration_minutes ?? 60);
          setToastMessage(`Zaplanowano zadanie: "${todo.title}" 📅`);
        } catch (err) {
          console.error('Failed to drop and schedule task:', err);
          setToastMessage('Nie udało się zaplanować zadania.');
        } finally {
          setSaving(false);
        }
      }}
    >
      {Array.from({ length: HOURS }, (_, i) => (
        <React.Fragment key={i}>
          <div
            className="absolute left-0 right-0 border-b border-border-custom/25 pointer-events-none"
            style={{ top: i * PX_PER_HOUR, height: PX_PER_HOUR }}
          />
          <div
            className="absolute left-0 right-0 border-b border-border-custom/10 border-dashed pointer-events-none"
            style={{ top: i * PX_PER_HOUR + PX_PER_HOUR / 2 }}
          />
        </React.Fragment>
      ))}

      {showSelection && selectionHeight > 0 && (
        <div
          className="absolute left-0.5 right-0.5 bg-primary/12 border border-primary/40 rounded-lg pointer-events-none z-[var(--z-sticky)] flex items-center justify-center shadow-xs backdrop-blur-xs transition-[top,height] duration-75"
          style={{ top: selectionTop, height: Math.max(18, selectionHeight) }}
        >
          <span className="text-2xs font-semibold text-primary bg-background/95 border border-border-custom/50 px-2 py-0.5 rounded-full shadow-2xs tabular-nums">
            {Math.floor(startMin / 60)}:{String(startMin % 60).padStart(2, '0')} – {Math.floor(endMin / 60)}:{String(endMin % 60).padStart(2, '0')}
          </span>
        </div>
      )}
      {(() => {
        const layouts = layoutDayEvents(dayEvents);
        return dayEvents.map((ev) => {
          const layout = layouts.get(ev.id) || { left: '0%', width: '100%' };
          return (
            <React.Fragment key={ev.id}>
              {renderEventBlock({ ev, left: layout.left, width: layout.width, handleEventMouseDown, handleEventContextMenu, handleEventClick })}
            </React.Fragment>
          );
        });
      })()}
      {dayTodos.map((todo) => (
        <React.Fragment key={`todo-${todo.id}`}>
          {renderTodoBlock({ todo, goalChipFor, completedTodoIds, handleToggleTodo, setEditingTodo, setEditingTodoTitle, setToastMessage })}
        </React.Fragment>
      ))}
      {(() => {
        const sun = getSunTimes(day);
        const sunriseTop = (sun.sunriseMin - HOUR_START * 60) * PX_PER_MIN;
        const sunsetTop  = (sun.sunsetMin  - HOUR_START * 60) * PX_PER_MIN;
        const sunriseVisible = sunriseTop >= 0 && sunriseTop <= HOURS * PX_PER_HOUR;
        const sunsetVisible  = sunsetTop  >= 0 && sunsetTop  <= HOURS * PX_PER_HOUR;
        const isMultiCol = colClass.includes('calendar-week-column');
        return (
          <>
            {sunriseVisible && (
              <div
                className="absolute left-0 right-0 flex items-center pointer-events-none z-[var(--z-raised)]"
                style={{ top: sunriseTop }}
                title={`Wschód: ${formatTimeWarsaw(sun.sunrise)}`}
              >
                <div className="w-full h-px bg-gradient-to-r from-warning/0 via-warning/50 to-warning/0" />
                {!isMultiCol && (
                  <span className="absolute right-1 text-2xs font-bold text-warning/70 select-none">🌅 {formatTimeWarsaw(sun.sunrise)}</span>
                )}
              </div>
            )}
            {sunsetVisible && (
              <div
                className="absolute left-0 right-0 flex items-center pointer-events-none z-[var(--z-raised)]"
                style={{ top: sunsetTop }}
                title={`Zachód: ${formatTimeWarsaw(sun.sunset)}`}
              >
                <div className="w-full h-px bg-gradient-to-r from-warning/0 via-warning/50 to-warning/0" />
                {!isMultiCol && (
                  <span className="absolute right-1 text-2xs font-bold text-warning/70 select-none">🌇 {formatTimeWarsaw(sun.sunset)}</span>
                )}
              </div>
            )}
          </>
        );
      })()}
      <NowLine day={day} today={today} />
    </div>
  );
};

export const renderAllDayTodos = ({
  days,
  untimedByDay,
  goalChipFor,
  completedTodoIds,
  handleToggleTodo,
  setEditingTodo,
  setEditingTodoTitle,
  setToastMessage,
}: CalendarGridAllDayTodosProps) => {
  if (!untimedByDay.some((list) => list.length > 0)) return null;

  const today = getTodayWarsaw();
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatWarsawDate(d);
  })();
  const isDayView = days.length === 1;
  const showHourlyWeather = isDayView && (days[0] === today || days[0] === tomorrow);
  const gutterPadClass = showHourlyWeather ? 'pl-11 sm:pl-[72px]' : 'pl-11';

  return (
    <div className={`flex border-b border-border-custom/40 bg-surface-solid/10 ${gutterPadClass}`}>
      {days.map((day, idx) => (
        <div key={day} className="flex-1 min-w-0 p-1 space-y-1 border-l border-border-custom/10 first:border-l-0">
          {untimedByDay[idx].map((todo) => {
            const chip = goalChipFor(todo.section_id);
            const GoalIcon = chip ? GOAL_ICON[chip.pillar] : null;
            const isCompleting = todo.status === 'done' || completedTodoIds.has(todo.id);
            return (
              <div
                key={todo.id}
                title={todo.title}
                draggable
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleTodo(todo.id);
                  setToastMessage(isCompleting ? `Zadanie przywrócone: "${todo.title}"` : `Ukończono: "${todo.title}" ✅`);
                }}
                onDragStart={(event) => {
                  event.stopPropagation();
                  event.dataTransfer.setData('text/plain', JSON.stringify({
                    id: todo.id,
                    title: todo.title,
                    duration_minutes: todo.duration_minutes || 60,
                  }));
                  event.dataTransfer.effectAllowed = 'move';
                }}
                className={`flex min-h-9 items-center gap-2 truncate rounded-lg border border-primary/20 bg-primary/10 px-2 text-xs font-bold text-primary transition-colors cursor-grab active:cursor-grabbing hover:bg-primary/15 ${isCompleting ? 'opacity-[var(--opacity-50)]' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTodo(todo);
                  setEditingTodoTitle(todo.title);
                }}
              >
                {GoalIcon && <GoalIcon size={11} className="shrink-0" />}
                <span className={`truncate ${isCompleting ? 'line-through' : ''}`}>{todo.title}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
