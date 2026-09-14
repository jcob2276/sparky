import { Calendar, Clock, Star } from 'lucide-react';
import type { ScheduleViewData } from '../../types/schedule';
import { Card } from '../ui/Card';

export function MagazineBar({ view }: { view: ScheduleViewData }) {
  const hasEditorial = Boolean(view.editorialIntro || view.quoteBlocks.length > 0);
  const hasTimeline = view.timeline.length > 0;

  if (!hasEditorial && !hasTimeline) {
    return null;
  }

  return (
    <section className="space-y-4">
      {hasEditorial && (
        <Card variant="outline" padding="1rem" className="space-y-2.5 border-primary/20 bg-primary/[0.02]">
          {view.editorialIntro && (
            <p className="text-sm font-medium leading-relaxed text-text-secondary">
              {view.editorialIntro}
            </p>
          )}

          {view.quoteBlocks.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 pt-1">
              {view.quoteBlocks.map((block) => (
                <div key={block.title} className="rounded-xl border border-border-custom/30 bg-surface/50 p-2.5">
                  <p className="text-3xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <Star size={10} /> {block.title}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary leading-relaxed">{block.content}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {hasTimeline && (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[var(--ds-arbitrary-0-14em)] text-text-muted">
            <Calendar size={12} className="text-primary" /> Harmonogram tygodnia
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {view.timeline.map((day) => {
              const isToday = day.dayLabel === 'DZIŚ';
              return (
                <div
                  key={day.dayDate}
                  className={`rounded-2xl border p-3 transition-all ${
                    isToday
                      ? 'border-primary/40 bg-primary/[0.04] shadow-sm'
                      : 'border-border-custom/40 bg-surface/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border-custom/20">
                    <span
                      className={`text-2xs font-black uppercase tracking-wider ${
                        isToday ? 'text-primary' : 'text-text-muted'
                      }`}
                    >
                      {day.dayLabel}
                    </span>
                    <span className="text-3xs font-mono text-text-muted">
                      {day.dayDate.slice(5)}
                    </span>
                  </div>

                  {day.items.length === 0 ? (
                    <p className="text-xs text-text-muted/60 italic py-1">Brak zaplanowanych zadań</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {day.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start gap-2 rounded-lg bg-surface/70 px-2 py-1.5 text-xs border border-border-custom/20"
                        >
                          <span
                            className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{
                              background:
                                item.color ??
                                (item.kind === 'todo' ? 'var(--color-primary)' : 'var(--color-success)'),
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-text-primary truncate leading-tight">
                              {item.title}
                            </p>
                            {item.sourceFact && (
                              <p className="text-3xs text-text-muted truncate mt-0.5">
                                {item.sourceFact}
                              </p>
                            )}
                          </div>
                          {item.dueAt && item.dueAt.includes('T') && (
                            <span className="flex items-center gap-0.5 text-3xs font-mono text-text-muted shrink-0">
                              <Clock size={9} />
                              {item.dueAt.split('T')[1].slice(0, 5)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
