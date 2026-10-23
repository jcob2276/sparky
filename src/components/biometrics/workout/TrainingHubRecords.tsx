import { Trophy } from 'lucide-react';
import type { HubLiftRecord } from '../../../lib/health/hubIntelligence';

interface Props {
  records: HubLiftRecord[];
}

/** Inline PRs — big three + pull-ups / OHP when logged. */
export default function TrainingHubRecords({ records }: Props) {
  if (records.length === 0) {
    return (
      <div className="trening-panel-muted px-3.5 py-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <Trophy size={15} />
        </div>
        <span className="text-xs text-text-secondary leading-snug">
          Brak rekordów — zaloguj serie, a Sparky zbuduje e1RM i PR BW (pompki/dipy/podciągnięcia).
        </span>
      </div>
    );
  }

  const cols = records.length >= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <section className="space-y-2" aria-label="Rekordy siłowe">
      <div className="flex items-center gap-1.5 px-0.5">
        <Trophy size={12} className="text-primary" />
        <span className="text-2xs font-semibold tracking-normal text-text-muted">
          PR · e1RM / reps
        </span>
      </div>
      <div className={`grid ${cols} gap-2`}>
        {records.map((r) => (
          <div
            key={r.key}
            className="trening-panel rounded-[var(--tren-radius-card)] px-2 py-2.5 text-center"
          >
            <p className="text-2xs font-bold tracking-normal text-text-muted truncate">
              {r.displayLabel}
            </p>
            <p className="text-xl font-semibold tabular-nums text-primary font-display leading-none mt-1.5">
              {r.value}
              <span className="text-2xs font-bold text-text-muted ml-0.5">
                {r.unit === 'reps' ? 'rep' : 'kg'}
              </span>
            </p>
            <p className="text-2xs text-text-muted tabular-nums mt-1.5">{r.date.slice(5)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
