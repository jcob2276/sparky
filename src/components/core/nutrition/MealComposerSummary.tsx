import { DEFAULT_PROTEIN_FLOOR_G } from '@vanguard/domain';
import type { WeekBalance } from '../../../lib/health/weekBalance';
import type { DayNutrientCoverage } from '../../../lib/health/nutrientCoverage';
import type { DayEnergyRange } from '../../../lib/health/nutritionAudit';
import NutrientCoverageStrip from './NutrientCoverageStrip';
import WeekBalanceStrip from './WeekBalanceStrip';
import DayCompletenessToggle from './DayCompletenessToggle';
import type { DayReview } from './hooks/useDayReview';

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
const FALLBACK_TARGET_KCAL = 2000;

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

function RingSide({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span className="font-display text-xl font-semibold tabular-nums text-text-primary">{value}</span>
    </div>
  );
}

function MacroTile({
  macro, label, grams, target, hint,
}: {
  macro: 'protein' | 'carbs' | 'fat';
  label: string;
  grams: number;
  target: number;
  hint?: string;
}) {
  const ratio = target > 0 ? Math.min(1, grams / target) : 0;
  return (
    <li className="meal-macro min-w-0 space-y-1.5 rounded-lg bg-surface-2 px-3 py-2.5" data-macro={macro} title={hint}>
      <span className="meal-macro-label block text-xs font-medium">{label}</span>
      <span className="block whitespace-nowrap tabular-nums text-text-muted">
        <span className="text-sm font-semibold text-text-primary">{Math.round(grams)}</span>
        <span className="text-2xs">/{target} g</span>
      </span>
      <span className="meal-bar-track block h-1.5 overflow-hidden rounded-full">
        <span className="meal-bar-fill block h-full w-full rounded-full" style={{ transform: `scaleX(${ratio})` }} />
      </span>
    </li>
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
  macros,
  week,
  nutrients,
  energy,
  dayReview,
}: {
  totals: Totals;
  qualityPending: boolean;
  macros?: { carbs: number; fat: number };
  week?: WeekBalance | null;
  nutrients?: DayNutrientCoverage;
  energy?: DayEnergyRange | null;
  dayReview?: DayReview;
}) {
  const targetKcal = totals.targetKcal ?? FALLBACK_TARGET_KCAL;
  const eaten = Math.round(totals.calories);
  // B uses the real target; W/T are derived (T = 30% kcal, W = the rest) because only B/kcal targets are stored.
  const targetProtein = Math.round(totals.targetProtein ?? DEFAULT_PROTEIN_FLOOR_G);
  const targetFat = Math.round((targetKcal * 0.3) / 9);
  const targetCarbs = Math.max(0, Math.round((targetKcal - targetProtein * 4 - targetFat * 9) / 4));
  const showQuality = qualityPending || totals.avgFoodQuality != null;

  return (
    <div className="space-y-3">
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <RingSide label="Zjedzone" value={eaten} />
      <MealCalorieRing eaten={eaten} target={targetKcal} />
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
    <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0" aria-label="Makroskładniki: zjedzone / cel">
      <MacroTile macro="protein" label="Białko" grams={totals.protein} target={targetProtein} />
      <MacroTile macro="carbs" label="Węgle" grams={macros?.carbs ?? 0} target={targetCarbs} hint="Cel orientacyjny" />
      <MacroTile macro="fat" label="Tłuszcze" grams={macros?.fat ?? 0} target={targetFat} hint="Cel orientacyjny (30% kcal)" />
    </ul>
    {energy && <EnergyRangeLine energy={energy} />}
    {nutrients && <NutrientCoverageStrip coverage={nutrients} />}
    {dayReview && <DayCompletenessToggle review={dayReview} />}
    {week && <WeekBalanceStrip week={week} />}
    </div>
  );
}
