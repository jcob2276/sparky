import type { ReviewContext } from '../../lib/goal/reviewCycle.data';
import { weekKpis } from '../../lib/goal/reviewWeekInsights';

/** Trzy liczby tygodnia: wielka wartość, podpis i cienki pasek. Bez tekstu i bez ramek w ramkach. */
export default function ReviewKpiTiles({ context }: { context: ReviewContext | undefined }) {
  const kpis = context ? weekKpis(context) : [];
  if (kpis.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {kpis.map((kpi) => (
        <div key={kpi.key} className="space-y-1 rounded-xl border border-border-custom bg-surface p-3 shadow-sm">
          <span className="block text-2xs font-bold text-text-muted">{kpi.label}</span>
          <span className="block text-xl font-bold tabular-nums leading-none text-text-primary">{kpi.value}</span>
          <span className="block text-2xs text-text-secondary">{kpi.caption}</span>
          {kpi.ratio !== null && (
            <div className="h-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(kpi.ratio * 100)}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
