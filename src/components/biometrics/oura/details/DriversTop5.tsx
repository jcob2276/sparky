import type { SleepToTop5Effect, Top5PredictorId } from '../../../../lib/biometrics/sleepDrivers/types';
import { OuraEvidenceBadge } from '../shared/OuraEvidenceBadge';
import { DIRECTION_LABEL, describeRho } from './driverGroups';
import { SplitBars } from './SplitBars';

const PREDICTOR: Record<Top5PredictorId, { label: string; unit: string }> = {
  sleep_h: { label: 'Długość snu', unit: 'pp' },
  sleep_score: { label: 'Jakość snu', unit: 'pp' },
};

/** Podsekcja „Sen → Twoja piątka”: jak noc przekłada się na wykonanie Top 5 następnego dnia. */
export function DriversTop5({ effects }: { effects: SleepToTop5Effect[] }) {
  const shown = effects.filter((effect) => effect.strength !== 'insufficient');
  return (
    <section className="space-y-3" aria-labelledby="drivers-top5-title">
      <div>
        <h3 id="drivers-top5-title" className="text-xl font-light text-text-primary">Sen → Twoja piątka</h3>
        <p className="mt-1 text-sm text-text-secondary">Jak noc przekłada się na to, co zrobisz z Top 5 następnego dnia.</p>
      </div>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-white/5 bg-surface-1 p-4 text-sm text-text-muted">
          Za mało dni z Top 5 i snem, by pokazać zależność.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((effect) => {
            const meta = PREDICTOR[effect.predictor];
            return (
              <li key={effect.predictor} className="space-y-2 rounded-xl border border-white/5 bg-surface-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-text-primary">{meta.label}</h4>
                  <OuraEvidenceBadge strength={effect.strength} n={effect.n} />
                </div>
                <p className="text-sm leading-6 text-text-secondary">{effect.headline}</p>
                <p className="text-xs text-text-muted">
                  {DIRECTION_LABEL[effect.direction]}{!effect.split && ` · ${describeRho(effect.rho)}`}
                </p>
                {effect.split && (
                  <SplitBars split={effect.split} unit={meta.unit} outcomeLabel={meta.label} direction={effect.direction} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
