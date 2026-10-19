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
      className="trening-panel rounded-[var(--tren-radius-card)] p-3 space-y-3"
      aria-label="Mapa zmęczenia"
    >
      <div className="flex items-center justify-between px-0.5">
        <span className="text-2xs font-black uppercase tracking-wider text-text-muted">
          Mapa zmęczenia
        </span>
        {week.sessions > 0 && (
          <span className="text-3xs font-bold text-text-tertiary tabular-nums">
            {week.sessions} sesj{week.sessions === 1 ? 'a' : week.sessions < 5 ? 'e' : 'i'} · tydzień
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

        <div className="w-[5.5rem] shrink-0 flex flex-col justify-center gap-3 border-l border-border-custom/60 pl-3">
          <div>
            <p className="text-3xs font-black uppercase tracking-wider text-text-muted">Reps</p>
            <p className="text-xl font-black text-text-primary font-display tabular-nums leading-none mt-1">
              {week.reps.toLocaleString('pl-PL')}
            </p>
          </div>
          <div>
            <p className="text-3xs font-black uppercase tracking-wider text-text-muted">Volume</p>
            <p className="text-xl font-black text-primary font-display tabular-nums leading-none mt-1">
              {volumeLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
