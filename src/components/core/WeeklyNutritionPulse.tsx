import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Utensils } from 'lucide-react';
import { useNutritionData } from './useNutritionData';
import NutrientCoverageStrip from './nutrition/NutrientCoverageStrip';
import WeekBalanceStrip from './nutrition/WeekBalanceStrip';
import { nutritionPulseHeadline, formatGrams } from '../../lib/weeklyNutritionPulse';
import { getWeekStartWarsaw } from '../../lib/date';
import { buildWeekNutrition } from '../../lib/health/weekNutrition';
import { fetchWeekNutritionInputs } from '../../lib/health/weekNutritionApi';
import { useUserId } from '../../store/useStore';

export default function WeeklyNutritionPulse({
  weeklyCalories,
  refreshSignal,
}: {
  weeklyCalories: number;
  refreshSignal: number;
}) {
  const userId = useUserId();
  const data = useNutritionData({ weeklyCalories, refreshSignal });
  const weekStart = getWeekStartWarsaw(data.todayRaw);
  const week = useQuery({
    queryKey: ['week-nutrition', userId ?? '', weekStart, refreshSignal],
    queryFn: () => fetchWeekNutritionInputs(userId!, weekStart),
    enabled: !!userId,
    refetchInterval: 60_000,
    refetchOnWindowFocus: 'always',
  });

  const nutrition = useMemo(
    () => week.data
      ? buildWeekNutrition({ data: week.data, weekStart, today: data.todayRaw, proteinGoal: data.proteinGoal, fallbackTarget: data.kcalTarget })
      : null,
    [week.data, weekStart, data.todayRaw, data.proteinGoal, data.kcalTarget],
  );
  const pulse = nutrition?.pulse;
  const hasDays = (pulse?.loggedDays ?? 0) > 0;
  const proteinLow = pulse?.proteinOnTrack === false;

  return (
    <section className="rounded-3xl border border-border-custom/60 bg-surface/70 p-4 space-y-3">
      <div>
        <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-widest text-text-muted">
          <Utensils size={12} className="text-primary" /> Odżywianie
          <span className="font-semibold normal-case tracking-normal">· pon–nd{hasDays ? `, średnia z ${pulse?.loggedDays} pełnych dni` : ''}</span>
        </p>
        <h3 className="mt-1 text-base font-bold text-text-primary">
          {week.isLoading || !pulse ? 'Ładuję przebieg…' : nutritionPulseHeadline(pulse)}
        </h3>
      </div>

      {nutrition?.balance && <WeekBalanceStrip week={nutrition.balance} />}

      {pulse && hasDays && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-2xl border p-3 ${proteinLow ? 'border-warning/30 bg-warning/10' : 'border-border-custom/40 bg-surface/50'}`}>
              <p className="text-3xs font-black uppercase tracking-widest text-text-muted">Białko / dzień</p>
              <p className="mt-1 text-xl font-black text-text-primary">
                {formatGrams(pulse.avgProtein)}
                {pulse.proteinGoal != null && <span className="ml-1 text-2xs font-bold text-text-muted">z {pulse.proteinGoal} g</span>}
              </p>
            </div>
            <div className="rounded-2xl border border-border-custom/40 bg-surface/50 p-3">
              <p className="text-3xs font-black uppercase tracking-widest text-text-muted">Kalorie / dzień</p>
              <p className="mt-1 text-xl font-black text-text-primary">
                {pulse.avgCalories}
                {pulse.kcalTarget != null && <span className="ml-1 text-2xs font-bold text-text-muted">z {pulse.kcalTarget}</span>}
              </p>
            </div>
          </div>
          <p className="text-xs font-semibold text-text-secondary">
            Węgle {formatGrams(pulse.avgCarbs)} · Tłuszcze {formatGrams(pulse.avgFat)}
            {pulse.avgQuality != null && ` · Jakość ${pulse.avgQuality}/100`}
          </p>
          <NutrientCoverageStrip coverage={{ fiber: nutrition!.fiber, saturatedFat: nutrition!.saturatedFat }} />
        </>
      )}

      {pulse && (pulse.proteinGoal == null || pulse.kcalTarget == null) && hasDays && (
        <p className="text-xs text-text-muted">Ustaw cel białka i kalorii w profilu odżywiania.</p>
      )}
    </section>
  );
}
