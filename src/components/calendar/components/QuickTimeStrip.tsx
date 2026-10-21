import React from 'react';
import { ChevronRight, Clock } from 'lucide-react';
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
  /** Klik w linię z datą i godziną otwiera pola Data / Od / Do. */
  onEditTime: () => void;
  allDay?: boolean;
  /** Czas trwania wpisany w tytule (np. „45m”) ma pierwszeństwo, więc presety są nieaktywne. */
  durationLocked?: boolean;
  /** Ukrywa linię z datą i godziną, gdy te same dane są już w polach Data / Od / Do. */
  showSummary?: boolean;
}

function durationLabel(mins: number): string {
  if (mins >= 60 && mins % 60 === 0) return `${mins / 60}h`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}

export function QuickTimeStrip({
  date,
  startTimeStr,
  endTimeStr,
  quickDuration,
  setQuickDuration,
  onEditTime,
  allDay = false,
  durationLocked = false,
  showSummary = true,
}: QuickTimeStripProps) {
  const friendlyDate = formatQuickDateLabel(date);
  const isCustomDuration = !DURATION_PRESETS.some((p) => p.mins === quickDuration);

  return (
    <div className="space-y-1.5">
      {showSummary && <Pressable
        type="button"
        onClick={onEditTime}
        aria-label="Zmień datę i godzinę"
        className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-left text-xs font-medium text-text-secondary hover:bg-surface-solid/40 active:bg-surface-solid/60 transition-colors"
      >
        <Clock size={13} className="shrink-0 text-primary" />
        <span className="font-semibold capitalize text-text-primary">{friendlyDate}</span>
        <span className="text-text-muted">·</span>
        <span className="font-bold tabular-nums text-primary">{allDay ? 'Cały dzień' : `${startTimeStr} – ${endTimeStr}`}</span>
        {!allDay && isCustomDuration && (
          <span className="rounded-md border border-border-custom/30 bg-surface-solid px-1.5 text-2xs font-semibold tabular-nums text-text-muted">
            {durationLabel(quickDuration)}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center text-2xs font-semibold text-text-muted">
          Zmień <ChevronRight size={12} />
        </span>
      </Pressable>}

      <div className={`flex items-center gap-1 ${allDay ? 'hidden' : ''}`}>
        {DURATION_PRESETS.map((p) => {
          const isSelected = quickDuration === p.mins;
          return (
            <Pressable
              key={p.mins}
              type="button"
              onClick={() => setQuickDuration(p.mins)}
              disabled={durationLocked}
              title={durationLocked ? 'Czas trwania jest wpisany w tytule' : undefined}
              className={`flex-1 rounded-lg border px-1 py-1.5 text-center text-2xs font-semibold select-none active:scale-[0.96] transition-all duration-100 disabled:opacity-[var(--opacity-dimmed)] disabled:active:scale-100 sm:py-1 ${
                isSelected
                  ? 'border-primary/50 bg-primary/20 text-primary font-bold'
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
