/**
 * @component AllDayStrip
 * @role Pasek wydarzeń całodniowych (urodziny, święta, obowiązki, wydarzenia
 *          wielodniowe) nad siatką godzin — styl Google/Notion Calendar.
 *          Wydarzenia całodniowe NIE renderują się już jako bloki czasowe.
 */
import React from 'react';
import { Sun } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import type { CalRow } from '../calendarHelpers';
import { LIFE_SPHERES } from '../../../lib/projects/lifeSpheres';

function categoryDotClass(category?: string | null): string {
  const normalized = (category || '').replace('ciało_', 'cialo_');
  return LIFE_SPHERES.find((s: { id: string; dot?: string }) => s.id === normalized)?.dot ?? 'bg-primary';
}

interface AllDayStripProps {
  days: string[];
  allDayByDay: CalRow[][];
  gutterWidth: number;
  onEventClick: (ev: CalRow) => void;
}

export function AllDayStrip({ days, allDayByDay, gutterWidth, onEventClick }: AllDayStripProps) {
  if (!allDayByDay.some((list) => list.length > 0)) return null;

  return (
    <div className="relative flex border-b border-border-custom/30 bg-surface-solid/15 backdrop-blur-xs items-center" style={{ paddingLeft: gutterWidth }}>
      <div
        className="absolute left-0 top-0 bottom-0 flex items-center justify-center text-text-muted/60"
        style={{ width: gutterWidth }}
        title="Wydarzenia całodniowe"
      >
        <Sun size={12} />
      </div>
      {days.map((day, idx) => (
        <div key={day} className="flex-1 min-w-0 space-y-1 border-l border-border-custom/20 p-1 first:border-l-0">
          {allDayByDay[idx].map((ev) => (
            <Pressable
              key={`${ev.id}-${day}`}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(ev);
              }}
              title={ev.summary || 'Wydarzenie całodniowe'}
              aria-label={ev.summary || 'Wydarzenie całodniowe'}
              className="flex w-full min-h-6 cursor-pointer items-center gap-1.5 truncate rounded-md border border-border-custom/40 bg-surface-solid/80 hover:bg-surface-solid px-2 py-0.5 text-left text-3xs font-semibold text-text-primary active:scale-[0.98] transition-[transform,background-color,border-color] duration-150 ease-out shadow-2xs"
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${categoryDotClass(ev.category)}`} />
              <span className="truncate">{ev.summary}</span>
            </Pressable>
          ))}
        </div>
      ))}
    </div>
  );
}
