import type { ReviewContext } from '../../lib/goal/reviewCycle.data';
import { dayCorrelations, recurringMissed } from '../../lib/goal/reviewWeekInsights';

/** Najważniejsze sygnały tygodnia: co podnosiło ocenę dnia i co było odkładane. */
export default function ReviewSignals({ context }: { context: ReviewContext }) {
  const correlations = context.days ? dayCorrelations(context.days) : [];
  const tasks = context.tasks;
  const avoided = tasks ? recurringMissed(tasks).filter((t) => t.count >= 2) : [];

  return (
    <div className="space-y-3">
      {correlations.length > 0 && (
        <div className="space-y-1">
          <span className="block text-2xs font-bold text-text-muted">Co ruszało ocenę dnia</span>
          <div className="flex flex-wrap gap-1.5">
            {correlations.map((c) => {
              const up = c.withAvg > c.withoutAvg;
              return (
                <span
                  key={c.label}
                  className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${up ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}
                >
                  {c.label}: {c.withAvg} vs {c.withoutAvg}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {avoided.length > 0 && (
        <p className="text-2xs text-text-secondary">
          <span className="font-bold text-danger">Odkładane cały tydzień:</span>{' '}
          {avoided.map((t) => `${t.title} ×${t.count}`).join(' · ')}
        </p>
      )}
    </div>
  );
}
