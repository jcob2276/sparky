import { ShieldAlert, Zap } from 'lucide-react';
import BodyMap from './BodyMap';
import type { HubWeekStats } from '../../../lib/health/hubRecovery';
import { formatWorkoutTonnage } from '../../../lib/health/workoutDisplay';

interface Props {
  fatigueByTag: Record<string, number>;
  week: HubWeekStats;
}

/** Primary Start visual: fatigue body map + this-week volume/reps. */
export default function TrainingHubWeekPanel({ fatigueByTag, week }: Props) {
  const volumeLabel = formatWorkoutTonnage(week.volumeKg) ?? '0 kg';

  return (
    <section
      className="trening-panel rounded-[var(--tren-radius-card)] p-3.5 space-y-3 border-border-custom/60"
      aria-label="Mapa regeneracji i objętość tygodnia"
    >
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <Zap size={13} className="text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Regeneracja & Objętość tygodnia
          </h2>
        </div>
        {week.sessions > 0 && (
          <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-2xs font-bold text-text-secondary tabular-nums border border-border-custom/40">
            {week.sessions} {week.sessions === 1 ? 'sesja' : week.sessions < 5 ? 'sesje' : 'sesji'}
          </span>
        )}
      </div>

      <div className="flex items-stretch gap-3">
        <div className="min-w-0 flex-1">
          <BodyMap
            fatigueByTag={fatigueByTag}
            compact
            className="!bg-transparent !border-0 !p-0 !rounded-none"
          />
        </div>

        <div className="w-24 shrink-0 flex flex-col justify-center gap-3.5 border-l border-border-custom/50 pl-3.5">
          <div>
            <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Powtórzenia</p>
            <p className="text-2xl font-bold text-text-primary font-mono tabular-nums leading-none mt-1">
              {week.reps.toLocaleString('pl-PL')}
            </p>
          </div>
          <div>
            <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Objętość</p>
            <p className="text-2xl font-bold text-primary font-mono tabular-nums leading-none mt-1">
              {volumeLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
