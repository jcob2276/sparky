/**
 * @component AppleRemindersSmartGrid
 * @role Implements Apple Reminders top smart lists grid (Dzisiaj, Zaplanowane, Wszystkie, Flaga, Ukończone).
 *       Neutralne kafelki z jednym akcentem dla aktywnej listy i licznikami na żywo.
 */

import React from 'react';
import { Calendar, Clock, Inbox, Flag, CheckCircle2 } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import type { TodoNavDest } from './TodoSidebar';

interface AppleRemindersSmartGridProps {
  navDest: TodoNavDest;
  onSelectNavDest: (dest: TodoNavDest) => void;
  todayCount: number;
  upcomingCount: number;
  allCount: number;
  flaggedCount: number;
  completedCount: number;
}

type Tone = 'primary' | 'danger' | 'neutral' | 'warning' | 'success';

export function AppleRemindersSmartGrid({
  navDest,
  onSelectNavDest,
  todayCount,
  upcomingCount,
  allCount,
  flaggedCount,
  completedCount,
}: AppleRemindersSmartGridProps) {
  const cards = [
    {
      id: 'today' as TodoNavDest,
      title: 'Dzisiaj',
      count: todayCount,
      icon: Calendar,
      tone: 'primary' as Tone,
    },
    {
      id: 'upcoming' as TodoNavDest,
      title: 'Zaplanowane',
      count: upcomingCount,
      icon: Clock,
      tone: 'danger' as Tone,
    },
    {
      id: 'all' as TodoNavDest,
      title: 'Wszystkie',
      count: allCount,
      icon: Inbox,
      tone: 'neutral' as Tone,
    },
    {
      id: 'flagged' as TodoNavDest,
      title: 'Z flagą',
      count: flaggedCount,
      icon: Flag,
      tone: 'warning' as Tone,
    },
    {
      id: 'completed' as TodoNavDest,
      title: 'Ukończone',
      count: completedCount,
      icon: CheckCircle2,
      tone: 'success' as Tone,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 mb-4 select-none sm:grid-cols-5 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
      {cards.map((card) => {
        const isActive = navDest === card.id;
        const Icon = card.icon;

        return (
          <Pressable
            key={card.id}
            onClick={() => onSelectNavDest(isActive ? 'overview' : card.id)}
            aria-label={`${card.title}: ${card.count} zadań`}
            aria-pressed={isActive}
            data-tone={card.tone}
            className="todo-tile todo-instant min-w-0 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-2 rounded-xl px-3 py-3 cursor-pointer text-left focus-visible:shadow-focus focus-visible:outline-none"
          >
            <div className="todo-tile-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
              <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <span className="justify-self-end text-3xl font-semibold leading-none tabular-nums tracking-tight">
              {card.count}
            </span>
            <span className="col-span-2 min-w-0 truncate text-sm font-semibold leading-tight tracking-tight opacity-90">
              {card.title}
            </span>
          </Pressable>
        );
      })}
    </div>
  );
}
