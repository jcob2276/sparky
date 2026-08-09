import { Card } from '../ui/Card';

export interface TimelineBlock {
  id: string;
  startMin: number; // minutes from midnight
  durationMin: number;
  label: string;
  variant: 'existing' | 'planned';
}

const PX_PER_MIN = 0.55;

/**
 * Compact read-only day timeline — existing calendar events (muted) vs.
 * newly-assigned task times (solid) on the same hour grid, so a conflict is
 * visible while picking a time instead of only after saving.
 */
export default function DayTimeline({
  blocks,
  dayStartHour = 7,
  dayEndHour = 22,
}: {
  blocks: TimelineBlock[];
  dayStartHour?: number;
  dayEndHour?: number;
}) {
  const dayStartMin = dayStartHour * 60;
  const dayEndMin = dayEndHour * 60;
  const totalMinutes = dayEndMin - dayStartMin;
  const heightPx = totalMinutes * PX_PER_MIN;
  const hours = Array.from({ length: dayEndHour - dayStartHour + 1 }, (_, i) => dayStartHour + i);

  return (
    <Card variant="outline" padding="0" className="overflow-y-auto bg-surface-1/40" style={{ maxHeight: 'var(--ds-inline-style-240)' }}>
      <div className="relative" style={{ height: heightPx }}>
        {hours.map((h) => (
          <div key={h} className="absolute left-0 right-0 flex items-start" style={{ top: (h - dayStartHour) * 60 * PX_PER_MIN }}>
            <span className="w-10 shrink-0 text-2xs font-bold text-text-muted/60 -translate-y-1.5 text-right pr-1.5">
              {String(h).padStart(2, '0')}:00
            </span>
            <div className="flex-1 border-t border-border-custom/25" />
          </div>
        ))}
        <div className="absolute inset-y-0 right-1" style={{ left: 'var(--ds-inline-style-42)' }}>
          {blocks.map((b) => {
            const blockStartMin = b.startMin;
            const blockEndMin = b.startMin + b.durationMin;

            if (blockEndMin <= dayStartMin || blockStartMin >= dayEndMin) {
              return null;
            }

            const visibleStartMin = Math.max(blockStartMin, dayStartMin);
            const visibleEndMin = Math.min(blockEndMin, dayEndMin);
            const visibleDurationMin = visibleEndMin - visibleStartMin;

            const top = (visibleStartMin - dayStartMin) * PX_PER_MIN;
            const height = Math.max(14, visibleDurationMin * PX_PER_MIN);
            const isExisting = b.variant === 'existing';

            return (
              <div
                key={b.id}
                title={b.label}
                className={`absolute left-0 right-0 rounded-lg px-2 py-0.5 overflow-hidden whitespace-nowrap text-2xs font-bold leading-tight flex items-center transition-all ${
                  isExisting
                    ? 'bg-surface-3 text-text-primary border border-border-custom/60 border-l-3 border-l-primary/80 shadow-2xs'
                    : 'bg-primary text-on-accent font-black shadow-md border border-primary-hover z-[var(--z-raised)]'
                }`}
                style={{ top, height }}
              >
                <span className="truncate">{b.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
