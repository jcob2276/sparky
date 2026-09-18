/**
 * @component AppleRemindersSmartGrid
 * @role Implements Apple Reminders top smart lists grid (Dzisiaj, Zaplanowane, Wszystkie, Flaga, Ukończone).
 *       Renders glassmorphic cards with Apple circular icons and live counter badges.
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
      bgColor: 'bg-primary',
      textColor: 'text-primary',
    },
    {
      id: 'upcoming' as TodoNavDest,
      title: 'Zaplanowane',
      count: upcomingCount,
      icon: Clock,
      bgColor: 'bg-danger',
      textColor: 'text-danger',
    },
    {
      id: 'all' as TodoNavDest,
      title: 'Wszystkie',
      count: allCount,
      icon: Inbox,
      bgColor: 'bg-text-primary',
      textColor: 'text-text-primary',
    },
    {
      id: 'flagged' as TodoNavDest,
      title: 'Z flagą',
      count: flaggedCount,
      icon: Flag,
      bgColor: 'bg-warning',
      textColor: 'text-warning',
    },
    {
      id: 'completed' as TodoNavDest,
      title: 'Ukończone',
      count: completedCount,
      icon: CheckCircle2,
      bgColor: 'bg-success',
      textColor: 'text-success',
    },
  ];

  return (
    <div className="flex items-stretch gap-2 px-1 py-1 mb-2 select-none overflow-x-auto no-scrollbar sm:grid sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const isActive = navDest === card.id;
        const Icon = card.icon;

        return (
          <Pressable
            key={card.id}
            onClick={() => onSelectNavDest(card.id)}
            aria-label={`${card.title}: ${card.count} zadań`}
            aria-pressed={isActive}
            className={`flex-1 min-w-[96px] sm:min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-200 cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              isActive
                ? 'border-primary/50 bg-primary/15 shadow-sm ring-2 ring-primary/20'
                : 'border-border-custom/40 bg-surface-solid/80 hover:bg-surface-solid hover:border-border-custom/60 shadow-xs'
            }`}
          >
            <div className={`w-7 h-7 shrink-0 rounded-full ${card.bgColor} text-on-accent flex items-center justify-center shadow-xs`}>
              <Icon size={14} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex flex-col leading-none justify-center">
              <span className={`text-sm font-black tabular-nums tracking-tight ${card.textColor}`}>
                {card.count}
              </span>
              <span className="text-3xs font-semibold text-text-secondary tracking-tight truncate mt-0.5">
                {card.title}
              </span>
            </div>
          </Pressable>
        );
      })}
    </div>
  );
}
