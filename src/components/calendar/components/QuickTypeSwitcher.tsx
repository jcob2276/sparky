import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

interface QuickTypeSwitcherProps {
  quickType: 'event' | 'task';
  onSelectEvent: () => void;
  onSelectTask: () => void;
}

export function QuickTypeSwitcher({
  quickType,
  onSelectEvent,
  onSelectTask,
}: QuickTypeSwitcherProps) {
  return (
    <div className="flex p-1 rounded-xl bg-surface-solid/50 border border-border-custom/25">
      <Pressable
        type="button"
        onClick={onSelectEvent}
        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg active:scale-[0.98] transition-all duration-150 ${
          quickType === 'event'
            ? 'bg-background text-primary shadow-xs font-bold border border-border-custom/20'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <Calendar size={13} />
        <span>Wydarzenie</span>
      </Pressable>
      <Pressable
        type="button"
        onClick={onSelectTask}
        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg active:scale-[0.98] transition-all duration-150 ${
          quickType === 'task'
            ? 'bg-background text-primary shadow-xs font-bold border border-border-custom/20'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <Clock size={13} />
        <span>Zadanie</span>
      </Pressable>
    </div>
  );
}
