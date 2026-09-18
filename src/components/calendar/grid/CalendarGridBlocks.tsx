import React from 'react';
import { Sparkles, Shield, Video } from 'lucide-react';
import {
  HOUR_START,
  HOUR_END,
  PX_PER_MIN,
  eventColor,
  formatTime,
  parseTime,
  detectVideoCallUrl,
} from '../calendarHelpers';
import { GOAL_ICON } from '../../todo/todoUtils';
import { EventQuickActions } from './EventQuickActions';
import type {
  CalendarGridEventBlockProps,
  CalendarGridTodoBlockProps,
} from './types';

export const renderEventBlock = ({
  ev,
  left,
  width,
  handleEventMouseDown,
  handleEventContextMenu,
  handleEventClick,
}: CalendarGridEventBlockProps) => {
  if (!ev.start_time || !ev.end_time) return null;
  const startMin = parseTime(ev.start_time);
  const endMin = parseTime(ev.end_time);

  if (endMin <= HOUR_START * 60 || startMin >= HOUR_END * 60) return null;

  const visibleStartMin = Math.max(HOUR_START * 60, startMin);
  const visibleEndMin = Math.min(HOUR_END * 60, endMin);
  const top = (visibleStartMin - HOUR_START * 60) * PX_PER_MIN;
  const height = Math.max(20, (visibleEndMin - visibleStartMin) * PX_PER_MIN);
  const tooShort = height < 32;
  const isMedium = height >= 32 && height < 54;
  const isAIScheduled = ev.summary?.includes('✨') || ev.summary?.includes('[AI]');
  const isFocusTime = ev.summary?.includes('Focus Time') || ev.summary?.includes('🛡️');
  const videoCall = detectVideoCallUrl(ev.location) || detectVideoCallUrl(ev.description) || detectVideoCallUrl(ev.summary);

  const startStr = ev.original_start_time ? formatTime(ev.original_start_time) : formatTime(ev.start_time);
  const endStr = ev.original_end_time ? formatTime(ev.original_end_time) : formatTime(ev.end_time);

  const rawSummary = ev.summary && ev.summary.trim() ? ev.summary.trim() : 'Wydarzenie';
  let displaySummary = rawSummary;
  if (tooShort) {
    const isSleep = rawSummary.toLowerCase().includes('sen') || rawSummary.toLowerCase().includes('sleep');
    if (isSleep) {
      displaySummary = `${startStr}-${endStr}`;
    } else {
      displaySummary = `${rawSummary} (${startStr}–${endStr})`;
    }
  }

  const textColor = isFocusTime ? 'text-primary dark:text-primary-hover' : 'text-current';
  const subtextColor = isFocusTime ? 'text-primary/80 dark:text-primary-hover/80' : 'text-current/75 font-semibold';

  return (
    <div
      key={ev.id}
      role="button"
      tabIndex={0}
      aria-label={`${rawSummary}: ${startStr}–${endStr}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleEventClick?.(ev);
        }
      }}
      onMouseDown={(e) => handleEventMouseDown(ev, e, 'move')}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleEventContextMenu?.(ev, e);
      }}
      className={`apple-event-card group absolute border-l-[4px] rounded-lg ${
        tooShort ? 'px-2 py-0.5 flex items-center justify-start' : 'px-2.5 py-1.5 flex flex-col justify-start gap-0.5'
      } overflow-hidden cursor-move shadow-2xs hover:shadow-md hover:brightness-[1.02] active:scale-[0.985] transition-[transform,box-shadow,filter] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 select-none ${eventColor(ev)}`}
      style={{ top, height, left: `calc(${left} + 1px)`, width: `calc(${width} - 2px)` }}
      title={rawSummary}
    >
      {!tooShort && <EventQuickActions ev={ev} />}
      <div className="flex items-start gap-1 min-w-0 w-full justify-start">
        {isAIScheduled && !tooShort && <Sparkles size={11} className="shrink-0 animate-pulse text-warning mt-0.5" />}
        {isFocusTime && !tooShort && <Shield size={11} className="shrink-0 text-current mt-0.5" />}
        {videoCall && !tooShort && <Video size={11} className="shrink-0 text-current mt-0.5" />}
        <p className={`${textColor} ${tooShort ? 'text-xs truncate font-bold' : isMedium ? 'text-xs font-bold leading-snug break-normal line-clamp-2' : 'text-xs md:text-sm font-bold leading-snug break-normal line-clamp-3'} hyphens-none`}>
          {displaySummary}
        </p>
      </div>
      {!tooShort && (
        <div className={`text-2xs font-medium tabular-nums ${subtextColor} flex items-center justify-between shrink-0`}>
          <span>{startStr}–{endStr}</span>
          {videoCall && (
            <a
              href={videoCall.url}
              target="_blank"
              rel="noopener noreferrer"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/15 hover:bg-black/20 dark:hover:bg-white/25 text-current font-bold text-3xs cursor-pointer transition-colors shadow-2xs"
              title={`Dołącz do spotkania (${videoCall.provider}): ${videoCall.url}`}
            >
              📹 {videoCall.provider}
            </a>
          )}
        </div>
      )}
      <div
        onMouseDown={(e) => handleEventMouseDown(ev, e, 'resize')}
        className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize group-hover:bg-current/10 z-[var(--z-sticky)] flex items-center justify-center"
      >
        <span className="w-4 h-0.5 rounded-full bg-current/20 group-hover:bg-current/40 opacity-0 group-hover:opacity-100 transition-opacity duration-100" />
      </div>
    </div>
  );
};

export const renderTodoBlock = ({
  todo,
  goalChipFor,
  completedTodoIds,
  handleToggleTodo,
  setEditingTodo,
  setEditingTodoTitle,
  setToastMessage,
}: CalendarGridTodoBlockProps) => {
  if (!todo.scheduled_time) return null;
  const startMin = parseTime(todo.scheduled_time);
  const duration = todo.duration_minutes || 30;
  const visibleStartMin = Math.max(HOUR_START * 60, startMin);
  const visibleEndMin = Math.min(HOUR_END * 60, startMin + duration);
  if (visibleEndMin <= visibleStartMin) return null;
  const top = (visibleStartMin - HOUR_START * 60) * PX_PER_MIN;
  const height = Math.max(18, (visibleEndMin - visibleStartMin) * PX_PER_MIN);
  const chip = goalChipFor(todo.section_id);
  const GoalIcon = chip ? GOAL_ICON[chip.pillar] : null;
  const isCompleting = todo.status === 'done' || completedTodoIds.has(todo.id);
  return (
    <div
      key={`todo-${todo.id}`}
      title={`${todo.title}${chip?.dreamTitle ? ` · ${chip.dreamTitle}` : ''}`}
      draggable
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleToggleTodo(todo.id);
        setToastMessage(isCompleting ? `Zadanie przywrócone: "${todo.title}"` : `Ukończono: "${todo.title}" ✅`);
      }}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: todo.id, title: todo.title, duration_minutes: todo.duration_minutes || 30 }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={(e) => {
        e.stopPropagation();
        setEditingTodo(todo);
        setEditingTodoTitle(todo.title);
      }}
      className={`absolute right-1 w-[min(180px,calc(100%-8px))] rounded-lg border border-primary/30 bg-surface-solid/90 hover:bg-surface-solid shadow-2xs hover:shadow-md px-2 py-1 overflow-hidden transition-[transform,background-color,border-color] duration-150 ease-out z-[var(--z-popover)] cursor-grab active:cursor-grabbing active:scale-[0.98] ${isCompleting ? 'opacity-[var(--opacity-50)]' : ''}`}
      style={{ top, height }}
    >
      <div className="flex items-start gap-0.5">
        <p className={`flex items-center gap-1 text-xs font-semibold text-primary leading-tight line-clamp-2 ${isCompleting ? 'line-through' : ''}`}>
          {GoalIcon && <GoalIcon size={10} className="shrink-0" />}
          <span className="truncate">{todo.title}</span>
        </p>
      </div>
    </div>
  );
};
