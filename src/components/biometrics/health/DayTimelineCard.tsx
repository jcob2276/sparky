/**
 * @file DayTimelineCard.tsx
 * @role Chronologiczna pionowa oś czasu dnia (Combined Day Timeline) w stylu Bevel / Whoop.
 */

import { Moon, Flame, Dumbbell, Sparkles, Clock } from 'lucide-react';
import type { DayTimelineItem } from '@vanguard/domain';

interface DayTimelineCardProps {
  items: DayTimelineItem[];
  dateFormatted?: string;
}

export function DayTimelineCard({ items, dateFormatted }: DayTimelineCardProps) {
  const safeItems = Array.isArray(items) ? items : [];

  const getEventIcon = (type: DayTimelineItem['type']) => {
    switch (type) {
      case 'sleep':
        return <Moon size={16} className="text-info" />;
      case 'running':
        return <Flame size={16} className="text-warning" />;
      case 'workout':
        return <Dumbbell size={16} className="text-primary" />;
      case 'restorative':
        return <Sparkles size={16} className="text-success" />;
      default:
        return <Clock size={16} className="text-text-muted" />;
    }
  };

  const getBadgeBorder = (accent: DayTimelineItem['accentColor']) => {
    switch (accent) {
      case 'indigo':
        return 'border-info/30 bg-info/10 text-info';
      case 'orange':
        return 'border-warning/30 bg-warning/10 text-warning';
      case 'blue':
        return 'border-primary/30 bg-primary/10 text-primary';
      case 'green':
        return 'border-success/30 bg-success/10 text-success';
      default:
        return 'border-border-custom bg-surface-2 text-text-secondary';
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border-custom/50 bg-surface-1/90 p-5 shadow-lg backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-text-secondary" />
          <h3 className="text-sm font-semibold tracking-wide text-text-primary">
            Przebieg Dnia (Timeline)
          </h3>
        </div>
        {dateFormatted && (
          <span className="text-xs text-text-muted">{dateFormatted}</span>
        )}
      </div>

      {safeItems.length === 0 ? (
        <div className="my-6 rounded-2xl border border-border-custom/30 bg-surface-2/30 p-6 text-center text-xs text-text-muted">
          Brak zarejestrowanych aktywności ani snu w tym okresie.
        </div>
      ) : (
        <div className="relative mt-5 space-y-4 pl-4 before:absolute before:bottom-2 before:left-[19px] before:top-2 before:w-[2px] before:bg-surface-3/60">
          {safeItems.map((item) => (
            <div key={item.id} className="relative flex items-start gap-3">
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-custom bg-surface-1 shadow-sm">
                {getEventIcon(item.type)}
              </div>

              <div className="flex-1 rounded-2xl border border-border-custom/40 bg-surface-2/40 p-3.5 transition-all hover:bg-surface-2/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-text-primary">
                    {item.title}
                  </span>
                  <span className="text-xs font-medium text-text-muted">
                    {item.timeFormatted}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
                  <span>Czas trwania: {item.durationFormatted}</span>
                </div>

                {item.metrics.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {item.metrics.map((m, mIdx) => (
                      <span
                        key={mIdx}
                        className={`rounded-full border px-2 py-0.5 text-3xs font-medium ${getBadgeBorder(
                          item.accentColor
                        )}`}
                      >
                        {m.label}: {m.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
