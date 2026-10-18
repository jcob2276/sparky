import { useState } from 'react';
import type { OuraHealthHubData } from './types';
import DataStateNotice from '../../core/DataStateNotice';
import { MealPlannerContainer } from '../nutrition/MealPlannerContainer';
import { formatWarsawDate, getTodayWarsaw } from '../../../lib/date';
import { HydrationCard } from '../health/HydrationCard';
import { NetEnergyCard } from '../health/NetEnergyCard';
import { calculateDynamicHydration, type NetEnergyGoal } from '@vanguard/domain';

import { OuraNutritionEnergy } from './OuraNutritionEnergy';

export function OuraNutritionFuelingView({data}:{data:OuraHealthHubData}) {
  const [netEnergyGoal, setNetEnergyGoal] = useState<NetEnergyGoal>('maintenance');
  const nutrition = data.nutrition;
  const userId = data.userId ?? data.strainRow?.user_id ?? data.oura?.user_id ?? '';
  const date = data.date || nutrition?.date || getTodayWarsaw();

  if (data.nutritionLoading && !nutrition) return <p role="status" className="text-sm text-text-muted">Wczytuję żywienie…</p>;
  const readError = data.nutritionError ? <DataStateNotice tone="warning" title={nutrition ? 'Nie udało się odświeżyć żywienia — pokazuję ostatni odczyt' : 'Nie udało się odczytać żywienia'} detail={data.nutritionError} /> : null;
  if (readError && !nutrition) return readError;
  if (!nutrition || nutrition.foodDataState === 'missing') {
    return (
      <div className="space-y-4 pb-8">
        {readError}
        <DataStateNotice title="Brak dziennika jedzenia" detail={`Brak wpisów dla ${data.date ?? 'wybranego dnia'}. Dodaj faktycznie zjedzony posiłek w zakładce Jedzenie.`} />
        {nutrition?.targetError && <DataStateNotice title="Cel żywienia wymaga uzupełnienia" detail={nutrition.targetError}/>}
        {userId && (
          <MealPlannerContainer
            userId={userId}
            date={date}
            targetKcal={nutrition?.targetKcal ?? null}
            targetProtein={nutrition?.targetProtein ?? null}
          />
        )}
      </div>
    );
  }

  const enhanced = data.enhanced?.date === date ? data.enhanced : null;
  const oura = data.oura?.date === date ? data.oura : null;
  const activeKcal = enhanced?.active_calories ?? oura?.active_calories ?? null;
  const totalKcal = enhanced?.total_calories ?? oura?.total_calories ?? null;
  const workoutSeconds = (data.stravaActivities ?? []).reduce((sum, activity) =>
    activity.start_date && formatWarsawDate(activity.start_date) === date ? sum + (activity.moving_time ?? 0) : sum, 0);
  const hydrationResult = calculateDynamicHydration({
    baseTargetMl: 2500,
    loggedIntakeMl: 0,
    activeCalories: activeKcal ?? 0,
    workoutDurationMinutes: workoutSeconds / 60,
  });

  return <div className="space-y-4 pb-8">
    {readError}
    {nutrition.targetError && <DataStateNotice title="Nie udało się odświeżyć celu żywienia" detail={nutrition.targetError}/>}
    <OuraNutritionEnergy nutrition={nutrition} data={data} date={date} />

    {/* Dynamiczne nawodnienie i kompensacja potu */}
    <HydrationCard initialData={hydrationResult} date={date} userId={userId} />

    {/* Bilans Energetyczny Netto (Bevel Net Energy) */}
    <NetEnergyCard
      activeCaloriesBurned={activeKcal}
      totalCaloriesBurned={nutrition.date === date ? totalKcal : null}
      caloriesConsumed={nutrition.calories}
      foodComplete={nutrition.foodComplete}
      targetGoal={netEnergyGoal}
      onGoalChange={setNetEnergyGoal}
    />

    {userId && (
      <MealPlannerContainer
        userId={userId}
        date={date}
        targetKcal={nutrition.targetKcal}
        targetProtein={nutrition.targetProtein}
      />
    )}

    <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-2">
      <h3 className="font-semibold">Źródła i ograniczenia</h3>
      <p className="text-xs text-text-secondary">Spożycie pochodzi z dziennika jedzenia, cele z planu żywienia tego samego dnia. Wydatek zegarka i zapotrzebowanie są szacunkami.</p>
      <p className="text-xs text-text-secondary">Brak pomiaru nawodnienia i stężenia kofeiny we krwi. Dziennik nie pozwala samodzielnie rozpoznać niedoboru składników odżywczych.</p>
    </section>
  </div>;
}

