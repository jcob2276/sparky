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

const TONES = {
  primary: { chip: 'bg-primary/15 text-primary', count: 'text-primary' },
  danger: { chip: 'bg-danger/15 text-danger', count: 'text-danger' },
  'text-secondary': { chip: 'bg-surface-2 text-text-secondary', count: 'text-text-primary' },
  warning: { chip: 'bg-warning/15 text-warning', count: 'text-warning' },
  success: { chip: 'bg-success/15 text-success', count: 'text-success' },
} as const;

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
      tone: 'primary' as keyof typeof TONES,
    },
    {
      id: 'upcoming' as TodoNavDest,
      title: 'Zaplanowane',
      count: upcomingCount,
      icon: Clock,
      tone: 'danger' as keyof typeof TONES,
    },
    {
      id: 'all' as TodoNavDest,
      title: 'Wszystkie',
      count: allCount,
      icon: Inbox,
      tone: 'text-secondary' as keyof typeof TONES,
    },
    {
      id: 'flagged' as TodoNavDest,
      title: 'Z flagą',
      count: flaggedCount,
      icon: Flag,
      tone: 'warning' as keyof typeof TONES,
    },
    {
      id: 'completed' as TodoNavDest,
      title: 'Ukończone',
      count: completedCount,
      icon: CheckCircle2,
      tone: 'success' as keyof typeof TONES,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 mb-4 select-none sm:grid-cols-5 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
      {cards.map((card) => {
        const isActive = navDest === card.id;
        const Icon = card.icon;
        const tone = TONES[card.tone];

        return (
          <Pressable
            key={card.id}
            onClick={() => onSelectNavDest(isActive ? 'overview' : card.id)}
            aria-label={`${card.title}: ${card.count} zadań`}
            aria-pressed={isActive}
            className={`todo-instant min-w-0 flex flex-col items-start gap-2 lg:flex-row lg:items-center lg:gap-3 px-3 py-3 rounded-lg border cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              isActive
                ? 'border-primary/50 bg-primary/15 shadow-sm ring-2 ring-primary/20'
                : 'border-transparent bg-surface-solid shadow-xs hover:shadow-sm'
            }`}
          >
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isActive ? 'bg-primary text-on-accent' : tone.chip}`}>
              <Icon size={14} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex flex-col leading-none justify-center">
              <span className={`text-2xl font-semibold tabular-nums tracking-tight ${isActive ? 'text-primary' : tone.count}`}>
                {card.count}
              </span>
              <span className="text-xs font-medium text-text-secondary tracking-tight leading-tight break-words mt-0.5">
                {card.title}
              </span>
            </div>
          </Pressable>
        );
      })}
    </div>
  );
}
