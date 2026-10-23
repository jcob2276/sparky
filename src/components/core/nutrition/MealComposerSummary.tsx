import type { WeekBalance } from '../../../lib/health/weekBalance';
import type { DayNutrientCoverage } from '../../../lib/health/nutrientCoverage';
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
const FALLBACK_TARGET_KCAL = 2000;

function MealCalorieRing({ eaten, target }: { eaten: number; target: number }) {
  const ratio = target > 0 ? Math.min(1, Math.max(0, eaten / target)) : 0;
  const over = eaten > target;
  return (
    <div
      role="img"
      aria-label={`Zjedzone ${eaten} z ${target} kcal`}
      className="relative h-18 w-18 shrink-0"
    >
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={RING_RADIUS} fill="none" strokeWidth="7" className="meal-ring-track" />
        <circle
          cx="40"
          cy="40"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - ratio)}
          className={over ? 'meal-ring-arc meal-ring-arc-over' : 'meal-ring-arc'}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-display text-lg font-semibold tabular-nums text-text-primary">{eaten}</span>
        <span className="mt-0.5 text-2xs font-semibold tabular-nums text-text-muted">/ {target}</span>
      </div>
    </div>
  );
}

function MacroRow({
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
    <li className="meal-macro flex h-4 items-center gap-2" data-macro={macro} title={hint}>
      <span className="meal-macro-label w-3 text-xs font-semibold">{label}</span>
      <span className="meal-bar-track h-1.5 flex-1 overflow-hidden rounded-full">
        <span className="meal-bar-fill block h-full w-full rounded-full" style={{ transform: `scaleX(${ratio})` }} />
      </span>
      <span className="w-18 text-right text-2xs font-semibold tabular-nums text-text-secondary">
        <span className="text-xs font-semibold text-text-primary">{Math.round(grams)}</span>/{target} g
      </span>
    </li>
  );
}

export function ComposerProgress({
  totals,
  qualityPending,
  macros,
  week,
  nutrients,
}: {
  totals: Totals;
  qualityPending: boolean;
  macros?: { carbs: number; fat: number };
  week?: WeekBalance | null;
  nutrients?: DayNutrientCoverage;
}) {
  const targetKcal = totals.targetKcal ?? FALLBACK_TARGET_KCAL;
  const eaten = Math.round(totals.calories);
  const remaining = Math.round(targetKcal - totals.calories);
  // B uses the real target; W/T are derived (T = 30% kcal, W = the rest) because only B/kcal targets are stored.
  const targetProtein = Math.round(totals.targetProtein ?? (targetKcal * 0.25) / 4);
  const targetFat = Math.round((targetKcal * 0.3) / 9);
  const targetCarbs = Math.max(0, Math.round((targetKcal - targetProtein * 4 - targetFat * 9) / 4));
  const showQuality = qualityPending || totals.avgFoodQuality != null;

  return (
    <div className="space-y-2">
    <div className="flex items-center gap-3">
      <MealCalorieRing eaten={eaten} target={targetKcal} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold leading-5 text-text-muted">
            {remaining >= 0 ? 'Zostało ' : 'Ponad o '}
            <span className="font-semibold tabular-nums text-text-primary">{Math.abs(remaining)} kcal</span>
          </p>
          {showQuality && (
            <span
              title={totals.foodQualityAnalysis ?? undefined}
              className="meal-quality shrink-0 rounded-md px-1.5 font-display text-2xs font-semibold tabular-nums"
            >
              {totals.avgFoodQuality != null ? `Jakość ${totals.avgFoodQuality}` : 'Jakość…'}
            </span>
          )}
        </div>
        <ul className="m-0 list-none space-y-0.5 p-0" aria-label="Makroskładniki: zjedzone / cel">
          <MacroRow macro="protein" label="B" grams={totals.protein} target={targetProtein} />
          <MacroRow macro="carbs" label="W" grams={macros?.carbs ?? 0} target={targetCarbs} hint="Cel orientacyjny" />
          <MacroRow macro="fat" label="T" grams={macros?.fat ?? 0} target={targetFat} hint="Cel orientacyjny (30% kcal)" />
        </ul>
      </div>
    </div>
    {nutrients && <NutrientCoverageStrip coverage={nutrients} />}
    {week && <WeekBalanceStrip week={week} />}
    </div>
  );
}
