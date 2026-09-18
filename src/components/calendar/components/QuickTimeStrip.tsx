import React from 'react';
import { Clock } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

import { formatQuickDateLabel } from '../calendarHelpers';

const DURATION_PRESETS = [
  { mins: 15, label: '15m' },
  { mins: 30, label: '30m' },
  { mins: 45, label: '45m' },
  { mins: 60, label: '1h' },
  { mins: 90, label: '1.5h' },
  { mins: 120, label: '2h' },
];

interface QuickTimeStripProps {
  date: string;
  startTimeStr: string;
  endTimeStr: string;
  quickDuration: number;
  setQuickDuration: (d: number) => void;
}

export function QuickTimeStrip({
  date,
  startTimeStr,
  endTimeStr,
  quickDuration,
  setQuickDuration,
}: QuickTimeStripProps) {
  const friendlyDate = formatQuickDateLabel(date);

  return (
    <div className="rounded-xl bg-surface-solid/35 border border-border-custom/30 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-text-secondary whitespace-nowrap min-w-0">
          <Clock size={13} className="text-primary shrink-0" />
          <span className="font-semibold text-text-primary capitalize">{friendlyDate}</span>
          <span className="text-text-muted">·</span>
          <span className="font-bold text-primary tabular-nums">{startTimeStr} – {endTimeStr}</span>
        </div>
        <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-surface-solid border border-border-custom/30 text-text-muted tabular-nums shrink-0">
          {quickDuration >= 60 ? `${quickDuration / 60}h` : `${quickDuration}m`}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {DURATION_PRESETS.map((p) => {
          const isSelected = quickDuration === p.mins;
          return (
            <Pressable
              key={p.mins}
              type="button"
              onClick={() => setQuickDuration(p.mins)}
              className={`flex-1 py-1 px-1 rounded-lg text-2xs font-semibold text-center select-none active:scale-[0.96] transition-all duration-100 border ${
                isSelected
                  ? 'border-primary/50 bg-primary/20 text-primary font-bold shadow-2xs'
                  : 'border-border-custom/20 bg-surface-solid/50 text-text-muted hover:text-text-primary hover:bg-surface-solid'
              }`}
            >
              {p.label}
            </Pressable>
          );
        })}
      </div>
    </div>
  );
}
