/**
 * @file ThreeRingHeroCard.tsx
 * @role Główny widget 3 pierścieni (Strain / Recovery / Sleep) zintegrowany z mikro-podsumowaniem trenera
 * w kanonicznym stylu Bevel Health.
 */

import Button from '../../ui/Button';

interface ThreeRingHeroCardProps {
  strainScore?: number | null; // 0 - 21
  recoveryScore?: number | null; // 0 - 100%
  sleepScore?: number | null; // 0 - 100%
  dateFormatted?: string;
  onSelectRing?: (ring: 'strain' | 'recovery' | 'sleep') => void;
}

interface SingleRingProps {
  label: string;
  valueFormatted: string;
  percentage: number;
  colorClass: string;
  strokeColor: string;
  onClick?: () => void;
}

function SingleRing({
  label,
  valueFormatted,
  percentage,
  colorClass,
  strokeColor,
  onClick,
}: SingleRingProps) {
  const radius = 38;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const validPct = typeof percentage === 'number' && Number.isFinite(percentage) ? percentage : 0;
  const clampedPct = Math.max(0, Math.min(100, validPct));
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      aria-label={`${label}: ${valueFormatted}`}
      className="!flex !h-auto !w-full !flex-1 !flex-col !items-center !rounded-2xl !p-2.5 transition-all hover:bg-surface-2"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-surface-3/50"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-base font-bold tracking-tight ${colorClass}`}>
            {valueFormatted}
          </span>
        </div>
      </div>
      <span className="mt-2 text-xs font-medium tracking-wide text-text-secondary">
        {label}
      </span>
    </Button>
  );
}

export function ThreeRingHeroCard({
  strainScore,
  recoveryScore,
  sleepScore,
  dateFormatted,
  onSelectRing,
}: ThreeRingHeroCardProps) {
  const safeRecovery = recoveryScore != null ? Math.round(recoveryScore) : null;
  const safeSleep = sleepScore != null ? Math.round(sleepScore) : null;
  const safeStrain = strainScore != null ? Math.round(strainScore * 10) / 10 : null;

  const strainPct = safeStrain != null ? Math.min(100, Math.round((safeStrain / 21) * 100)) : 0;
  const recoveryPct = safeRecovery ?? 0;
  const sleepPct = safeSleep ?? 0;

  let coachingText = 'Brak wystarczających danych do podsumowania dnia.';
  if (safeRecovery != null && safeRecovery >= 75) {
    if (safeStrain != null && safeStrain >= 14) {
      coachingText = 'Zapisano wysokie obciążenie i wysoki wynik regeneracji. Decyzja treningowa wymaga także planu i aktualnych odczuć.';
    } else {
      coachingText = 'Wysoka regeneracja według zapisanego wyniku. Sam wynik nie ustala gotowości do mocniejszego treningu.';
    }
  } else if (safeRecovery != null && safeRecovery < 45) {
    coachingText = 'Zapisany wynik regeneracji jest niski. Sprawdź wspólną decyzję treningową i swoje odczucia.';
  } else if (safeSleep != null && safeSleep < 65) {
    coachingText = 'Zapisano niższy wynik snu. Sam wynik snu nie wyjaśnia przyczyny ani nie ustala gotowości treningowej.';
  } else if (safeRecovery != null) {
    coachingText = 'Wynik regeneracji jest w środkowym zakresie. Decyzja treningowa uwzględnia także plan i aktualny stan.';
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border-custom/50 bg-surface-1/90 p-5 shadow-lg">
      {dateFormatted && (
        <div className="mb-3 flex items-center justify-between text-xs font-medium text-text-muted">
          <span>{dateFormatted}</span>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-text-secondary">Aktywny</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <SingleRing
          label="Strain"
          valueFormatted={safeStrain != null ? `${safeStrain}` : '—'}
          percentage={strainPct}
          colorClass="text-warning"
          strokeColor="var(--color-warning)"
          onClick={() => onSelectRing?.('strain')}
        />
        <SingleRing
          label="Regeneracja"
          valueFormatted={safeRecovery != null ? `${safeRecovery}%` : '—'}
          percentage={recoveryPct}
          colorClass="text-success"
          strokeColor="var(--color-success)"
          onClick={() => onSelectRing?.('recovery')}
        />
        <SingleRing
          label="Sen"
          valueFormatted={safeSleep != null ? `${safeSleep}%` : '—'}
          percentage={sleepPct}
          colorClass="text-info"
          strokeColor="var(--color-info)"
          onClick={() => onSelectRing?.('sleep')}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-border-custom/40 bg-surface-2/60 p-3.5">
        <p className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
          Sparky Coach
        </p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          {coachingText}
        </p>
      </div>
    </section>
  );
}
