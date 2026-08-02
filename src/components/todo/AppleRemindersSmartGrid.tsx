/**
 * @component AppleRemindersSmartGrid
 * @role Implements Apple Reminders top smart lists grid (Dzisiaj, Zaplanowane, Wszystkie, Flaga, Ukończone).
 *       Renders glassmorphic cards with Apple circular icons and live counter badges.
 */

import React from 'react';
import { Calendar, Clock, Inbox, Flag, CheckCircle2 } from 'lucide-react';
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 p-3 mb-2 select-none">
      {cards.map((card) => {
        const isActive = navDest === card.id;
        const Icon = card.icon;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectNavDest(card.id)}
            className={`flex flex-col justify-between p-3 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-95 text-left ${
              isActive
                ? 'border-primary/50 bg-primary/10 shadow-sm ring-2 ring-primary/20'
                : 'border-border-custom/30 bg-surface-solid/40 hover:bg-surface-solid/70 hover:border-border-custom/60 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className={`w-8 h-8 rounded-full ${card.bgColor} text-on-accent flex items-center justify-center shadow-xs`}>
                <Icon size={16} strokeWidth={2.5} />
              </div>
              <span className={`text-xl font-black tabular-nums tracking-tight ${card.textColor}`}>
                {card.count}
              </span>
            </div>

            <span className="text-xs font-bold text-text-secondary tracking-tight">
              {card.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
