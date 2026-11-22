import { Trophy, Flame } from 'lucide-react';
import type { HubLiftRecord } from '../../../lib/health/hubIntelligence';

interface Props {
  records: HubLiftRecord[];
}

/** Inline PRs — big three + pull-ups / OHP when logged. */
export default function TrainingHubRecords({ records }: Props) {
  if (records.length === 0) {
    return (
      <div className="trening-panel-muted px-3.5 py-3 flex items-center gap-2.5 rounded-[var(--tren-radius-card)] border border-border-custom/50">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <Trophy size={16} />
        </div>
        <span className="text-xs text-text-secondary leading-snug">
          Brak rekordów — zaloguj serie, a Sparky automatycznie wyznaczy Twoje e1RM oraz rekordy z masą ciała (pompki, dipy, podciągnięcia).
        </span>
      </div>
    );
  }

  const cols = records.length >= 4 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3';

  return (
    <section className="space-y-2.5" aria-label="Rekordy siłowe">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <Trophy size={13} className="text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Rekordy życiowe · PR
          </h2>
        </div>
        <span className="text-2xs font-semibold text-text-tertiary">
          e1RM & reps
        </span>
      </div>

      <div className={`grid ${cols} gap-2`}>
        {records.map((r) => {
          const dateLabel = r.date ? r.date.slice(5).replace('-', '.') : '';
          return (
            <div
              key={r.key}
              className="trening-panel rounded-[var(--tren-radius-card)] p-3 text-center border-border-custom/60 hover:border-primary/30 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xs font-bold uppercase tracking-wider text-text-muted truncate">
                    {r.displayLabel}
                  </span>
                </div>
                <p className="text-xl font-bold tabular-nums text-primary font-display leading-none mt-2">
                  {r.value}
                  <span className="text-xs font-semibold text-text-secondary ml-0.5">
                    {r.unit === 'reps' ? 'powt.' : 'kg'}
                  </span>
                </p>
              </div>
              <div className="mt-2.5 pt-1.5 border-t border-border-custom/30 flex items-center justify-center gap-1">
                <Flame size={10} className="text-primary/60" />
                <span className="text-2xs text-text-muted tabular-nums font-mono">
                  {dateLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
