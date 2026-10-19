import { useMemo } from 'react';
import { Utensils } from 'lucide-react';
import { useNutritionData } from './useNutritionData';
import { buildWeeklyNutritionPulse, formatGrams, nutritionPulseHeadline } from '../../lib/weeklyNutritionPulse';

export default function WeeklyNutritionPulse({
  weeklyCalories,
  refreshSignal,
}: {
  weeklyCalories: number;
  refreshSignal: number;
}) {
  const data = useNutritionData({ weeklyCalories, refreshSignal });

  const pulse = useMemo(
    () =>
      buildWeeklyNutritionPulse({
        rows: data.rows,
        proteinGoal: data.proteinGoal,
        kcalTarget: data.kcalTarget,
        today: data.todayRaw,
      }),
    [data.rows, data.proteinGoal, data.kcalTarget, data.todayRaw],
  );

  const hasDays = pulse.loggedDays > 0;
  const proteinLow = pulse.proteinOnTrack === false;

  return (
    <section className="rounded-3xl border border-border-custom/60 bg-surface/70 p-4 space-y-3">
      <div>
        <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-widest text-text-muted">
          <Utensils size={12} className="text-primary" /> Odżywianie
          {hasDays && <span className="font-semibold normal-case tracking-normal">· średnia z {pulse.loggedDays} dni</span>}
        </p>
        <h3 className="mt-1 text-base font-bold text-text-primary">
          {data.loading ? 'Ładuję przebieg…' : nutritionPulseHeadline(pulse)}
        </h3>
      </div>

      {hasDays && (
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-2xl border p-3 ${proteinLow ? 'border-warning/30 bg-warning/10' : 'border-border-custom/40 bg-surface/50'}`}>
            <p className="text-3xs font-black uppercase tracking-widest text-text-muted">Białko</p>
            <p className="mt-1 text-xl font-black text-text-primary">
              {formatGrams(pulse.avgProtein)}
              {pulse.proteinGoal != null && <span className="ml-1 text-2xs font-bold text-text-muted">z {pulse.proteinGoal} g</span>}
            </p>
          </div>
          <div className="rounded-2xl border border-border-custom/40 bg-surface/50 p-3">
            <p className="text-3xs font-black uppercase tracking-widest text-text-muted">Kalorie</p>
            <p className="mt-1 text-xl font-black text-text-primary">
              {pulse.avgCalories}
              {pulse.kcalTarget != null && <span className="ml-1 text-2xs font-bold text-text-muted">z {pulse.kcalTarget}</span>}
            </p>
          </div>
        </div>
      )}

      {hasDays && (
        <p className="text-xs font-semibold text-text-secondary">
          Węgle {formatGrams(pulse.avgCarbs)} · Tłuszcze {formatGrams(pulse.avgFat)} · Błonnik {formatGrams(pulse.avgFiber)}
          {pulse.avgQuality != null && ` · Jakość ${pulse.avgQuality}/100`}
        </p>
      )}

      {(pulse.proteinGoal == null || pulse.kcalTarget == null) && hasDays && (
        <p className="text-xs text-text-muted">Ustaw cel białka i kalorii w profilu odżywiania.</p>
      )}
    </section>
  );
}
