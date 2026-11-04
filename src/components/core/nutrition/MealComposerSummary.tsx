import { formatDecimalPl } from '../../../lib/formatPl';
import type { WeekBalance } from '../../../lib/health/weekBalance';
import type { DayNutrientCoverage } from '../../../lib/health/nutrientCoverage';
import type { DayEnergyRange } from '../../../lib/health/nutritionAudit';
import NutrientCoverageStrip from './NutrientCoverageStrip';
import WeekBalanceStrip from './WeekBalanceStrip';

type Totals = {
  calories: number;
  protein: number;
  targetKcal: number | null;
  targetProtein: number | null;
  avgFoodQuality: number | null;
  foodQualityAnalysis: string | null;
};

const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function MealCalorieRing({ eaten, target }: { eaten: number; target: number }) {
  const ratio = target > 0 ? Math.min(1, Math.max(0, eaten / target)) : 0;
  const over = eaten > target;
  const remaining = Math.round(target - eaten);
  return (
    <div
      role="img"
      aria-label={`Zjedzone ${eaten} z ${target} kcal`}
      className="relative h-32 w-32 shrink-0"
    >
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={RING_RADIUS} fill="none" strokeWidth="6" className="meal-ring-track" />
        <circle
          cx="40"
          cy="40"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - ratio)}
          className={over ? 'meal-ring-arc meal-ring-arc-over' : 'meal-ring-arc'}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-2xs font-medium text-text-muted">{remaining >= 0 ? 'Zostało' : 'Ponad o'}</span>
        <span className="mt-1 font-display text-3xl font-semibold tabular-nums text-text-primary">{Math.abs(remaining)}</span>
        <span className="mt-1 text-2xs font-medium text-text-muted">kcal</span>
      </div>
    </div>
  );
}

function RingSide({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span className="font-display text-xl font-semibold tabular-nums text-text-primary">{value == null ? '—' : formatDecimalPl(value)}</span>
    </div>
  );
}

/** Pokazuje zakres, gdy wynik dnia jest wyraźnie szacunkiem; pewne dane nie dostają dodatkowej linii. */
function EnergyRangeLine({ energy }: { energy: DayEnergyRange }) {
  if (energy.estimatedSharePct < 15) return null;
  return (
    <p
      className="text-2xs font-semibold tabular-nums text-text-muted"
      title="Szacunki ze zdjęć i AI mylą się w jedną stronę, więc rozstępy się sumują, nie uśredniają"
    >
      Możliwy zakres <span className="text-text-primary">{energy.min}–{energy.max} kcal</span>
      <span className="text-warning"> · {energy.estimatedSharePct}% to szacunek</span>
    </p>
  );
}

export function ComposerProgress({
  totals,
  qualityPending,
  hasEntries,
  week,
  nutrients,
  energy,
}: {
  totals: Totals;
  qualityPending: boolean;
  hasEntries: boolean;
  week?: WeekBalance | null;
  nutrients?: DayNutrientCoverage;
  energy?: DayEnergyRange | null;
}) {
  const targetKcal = totals.targetKcal;
  const eaten = Math.round(totals.calories);
  const showQuality = qualityPending || totals.avgFoodQuality != null;

  return (
    <div className="space-y-3">
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <RingSide label="Zjedzone" value={hasEntries ? eaten : null} />
      {hasEntries && targetKcal != null && targetKcal > 0 ? <MealCalorieRing eaten={eaten} target={targetKcal} /> : (
        <div className="flex h-32 w-32 flex-col items-center justify-center text-center text-text-muted">
          <span className="text-3xl">—</span>
          <span className="mt-1 text-2xs">{hasEntries ? 'Brak celu kcal' : 'Dziennik jedzenia · brak danych kcal'}</span>
        </div>
      )}
      <RingSide label="Cel" value={targetKcal} />
    </div>
    {showQuality && (
      <div className="flex justify-center">
        <span
          title={totals.foodQualityAnalysis ?? undefined}
          className="meal-quality rounded-md px-2 py-0.5 font-display text-2xs font-semibold tabular-nums"
        >
          {totals.avgFoodQuality != null ? `Jakość ${totals.avgFoodQuality}` : 'Jakość…'}
        </span>
      </div>
    )}
    {energy && <EnergyRangeLine energy={energy} />}
    {nutrients && <NutrientCoverageStrip coverage={nutrients} />}
    {week && <WeekBalanceStrip week={week} />}
    </div>
  );
}
