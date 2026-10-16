/**
 * @file CircularTargetStrainCard.tsx
 * @role Kołowa tarcza obciążenia (Circular Strain Dial with Target Arc) w kanonicznym stylu Bevel Health.
 */

import { Flame, Clock } from 'lucide-react';

interface CircularTargetStrainCardProps {
  currentStrain: number | null | undefined; // 0 - 21
  targetMin?: number | null; // np. 9.0 (0-21)
  targetMax?: number | null; // np. 14.5 (0-21)
  durationMinutes?: number | null;
  totalCaloriesKcal?: number | null;
  coachExplanation?: string | null;
}

export function CircularTargetStrainCard({
  currentStrain,
  targetMin,
  targetMax,
  durationMinutes,
  totalCaloriesKcal,
  coachExplanation,
}: CircularTargetStrainCardProps) {
  const strainVal = typeof currentStrain === 'number' && Number.isFinite(currentStrain)
    ? Math.max(0, Math.min(21, currentStrain))
    : null;

  const strainPct = Math.round(((strainVal ?? 0) / 21) * 100);
  const hasTarget = typeof targetMin === 'number' && Number.isFinite(targetMin)
    && typeof targetMax === 'number' && Number.isFinite(targetMax)
    && targetMin >= 0 && targetMax <= 21 && targetMin <= targetMax;
  const tMin = hasTarget ? targetMin : 0;
  const tMax = hasTarget ? targetMax : 0;
  const targetMinPct = Math.min(100, Math.round((tMin / 21) * 100));
  const targetMaxPct = Math.min(100, Math.round((tMax / 21) * 100));

  const radius = 64;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;

  const rawDashoffset = circumference - (Math.min(100, Math.max(0, strainPct)) / 100) * circumference;
  const strokeDashoffset = Number.isFinite(rawDashoffset) ? rawDashoffset : circumference;
  const safeArcLength = Math.max(0, Math.min(circumference, ((Math.max(0, targetMaxPct - targetMinPct)) / 100) * circumference));
  const safeArcRest = Math.max(0, circumference - safeArcLength);
  const targetArcOffset = circumference - (Math.max(0, Math.min(100, targetMinPct)) / 100) * circumference;

  const roundedMinutes = Math.round(durationMinutes ?? 0);
  const durH = Math.floor(roundedMinutes / 60);
  const durM = roundedMinutes % 60;
  const durationFormatted = durationMinutes == null ? '—' : durH > 0 ? `${durH}h ${durM}m` : `${durM}m`;

  let statusBadge = strainVal == null ? 'Brak pomiaru' : hasTarget ? 'Poniżej celu' : 'Brak ustalonego celu';
  let statusBadgeClass = 'text-text-secondary bg-surface-2 border-border-custom';
  if (strainVal != null && hasTarget && strainVal >= tMin && strainVal <= tMax) {
    statusBadge = 'Cel osiągnięty';
    statusBadgeClass = 'text-success bg-success/10 border-success/30';
  } else if (strainVal != null && hasTarget && strainVal > tMax) {
    statusBadge = 'Przekroczenie celu (All-out)';
    statusBadgeClass = 'text-danger bg-danger/10 border-danger/30';
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border-custom/50 bg-surface-1/90 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-text-primary">
          Dzienne Obciążenie (Strain)
        </h3>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass}`}>
          {statusBadge}
        </span>
      </div>

      <div className="relative my-6 flex flex-col items-center justify-center">
        <div className="relative h-44 w-44">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-surface-3/40"
            />

            {hasTarget && <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="var(--color-warning)"
              strokeOpacity="0.35"
              strokeWidth={strokeWidth + 4}
              strokeDasharray={`${safeArcLength} ${safeArcRest}`}
              strokeDashoffset={targetArcOffset}
              className="transition-all"
            />}

            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="var(--color-warning)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold tracking-tight text-text-primary">
              {strainVal == null ? '—' : strainVal.toFixed(1)}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-warning">
              Strain
            </span>
            <span className="mt-1 text-3xs text-text-muted">
              {hasTarget ? `Cel: ${tMin.toFixed(1)} – ${tMax.toFixed(1)}` : 'Skala 0–21'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-border-custom/40 bg-surface-2/50 p-3.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-surface-3 text-text-secondary">
            <Clock size={18} />
          </div>
          <div>
            <span className="text-3xs font-medium text-text-muted">Czas aktywności</span>
            <p className="text-sm font-bold text-text-primary">{durationFormatted}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border-custom/40 bg-surface-2/50 p-3.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-surface-3 text-warning">
            <Flame size={18} />
          </div>
          <div>
            <span className="text-3xs font-medium text-text-muted">Energia aktywna</span>
            <p className="text-sm font-bold text-text-primary">
              {totalCaloriesKcal != null ? `${totalCaloriesKcal.toLocaleString('pl-PL')} kcal` : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border-custom/40 bg-surface-2/60 p-3.5">
        <p className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
          O danych
        </p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          {coachExplanation ||
            'Obciążenie opisuje zarejestrowaną aktywność. Sam wynik nie określa gotowości do treningu.'}
        </p>
      </div>
    </section>
  );
}
