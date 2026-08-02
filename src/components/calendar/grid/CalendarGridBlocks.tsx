import { Pressable } from '../../ui/ControlPrimitives';
import React from 'react';
import { Sparkles, Shield, Check, Video } from 'lucide-react';
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

  let displaySummary = ev.summary;
  if (tooShort) {
    const isSleep = ev.summary?.toLowerCase().includes('sen') || ev.summary?.toLowerCase().includes('sleep');
    if (isSleep) {
      displaySummary = `${formatTime(ev.start_time)}-${formatTime(ev.end_time)}`;
    } else {
      displaySummary = `${ev.summary} (${formatTime(ev.start_time)}–${formatTime(ev.end_time)})`;
    }
  }

  return (
    <div
      key={ev.id}
      onMouseDown={(e) => handleEventMouseDown(ev, e, 'move')}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleEventContextMenu?.(ev, e);
      }}
      className={`apple-event-card absolute border-l-[3.5px] rounded-r-lg ${
        tooShort ? 'px-2 py-0.5 flex items-center justify-start' : 'px-2 py-1 flex flex-col justify-between'
      } overflow-hidden cursor-move shadow-xs hover:shadow-md hover:z-[var(--z-popover)] select-none ${eventColor(ev)}`}
      style={{ top, height, left: `calc(${left} + 1px)`, width: `calc(${width} - 2px)` }}
      title={ev.summary || ''}
    >
      <div className="flex items-start gap-1 min-w-0 w-full justify-start">
        {isAIScheduled && !tooShort && <Sparkles size={11} className="shrink-0 animate-pulse text-amber-500 mt-0.5" />}
        {isFocusTime && !tooShort && <Shield size={11} className="shrink-0 text-current mt-0.5" />}
        {videoCall && !tooShort && <Video size={11} className="shrink-0 text-current mt-0.5" />}
        <p className={`text-white ${tooShort ? 'text-xs truncate font-black' : isMedium ? 'text-xs font-black leading-tight break-words line-clamp-2' : 'text-xs md:text-sm font-black leading-snug break-words line-clamp-4'}`}>
          {displaySummary}
        </p>
      </div>
      {!tooShort && (
        <div className="mt-0.5 text-3xs font-bold tracking-wider uppercase text-white/90 flex items-center justify-between shrink-0">
          <span>{formatTime(ev.start_time)}–{formatTime(ev.end_time)}</span>
          {videoCall && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-white/25 text-white font-bold text-3xs">
              📹 {videoCall.provider}
            </span>
          )}
        </div>
      )}
      <div
        onMouseDown={(e) => handleEventMouseDown(ev, e, 'resize')}
        className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-black/10 dark:hover:bg-white/10 z-[var(--z-sticky)]"
      />
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
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: todo.id, title: todo.title, duration_minutes: todo.duration_minutes }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={(e) => {
        e.stopPropagation();
        setEditingTodo(todo);
        setEditingTodoTitle(todo.title);
      }}
      className={`absolute rounded-lg border border-primary/40 bg-background/95 shadow-md hover:bg-surface-solid px-2 py-1 overflow-hidden transition-all duration-[var(--motion-fast)] z-[var(--z-popover)] cursor-grab active:cursor-grabbing ${isCompleting ? 'opacity-[var(--opacity-50)]' : ''}`}
      style={{ top, height, left: 'var(--ds-inline-style-75)', width: 'var(--ds-inline-style-24)' }}
    >
      <div className="flex items-start gap-0.5">
        <Pressable
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleTodo(todo.id);
            setToastMessage(`Ukończono: "${todo.title}" ✅`);
          }}
          aria-label={`Oznacz zadanie jako wykonane: ${todo.title}`}
          className={`relative after:absolute after:-inset-2 mt-0.5 h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center transition-colors ${isCompleting ? 'bg-success border-success' : 'border-primary/50 hover:bg-primary/20'}`}
        >
          {isCompleting && <Check size={9} className="text-on-accent" strokeWidth={4} />}
        </Pressable>
        <p className={`flex items-center gap-1 text-xs font-bold text-primary leading-tight line-clamp-2 ${isCompleting ? 'line-through' : ''}`}>
          {GoalIcon && <GoalIcon size={10} className="shrink-0" />}
          <span className="truncate">{todo.title}</span>
        </p>
      </div>
    </div>
  );
};
