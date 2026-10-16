import { useState } from 'react';
import type { OuraHealthHubData } from './types';
import DataStateNotice from '../../core/DataStateNotice';
import { MealPlannerContainer } from '../nutrition/MealPlannerContainer';
import { formatWarsawDate, getTodayWarsaw } from '../../../lib/date';
import { HydrationCard } from '../health/HydrationCard';
import { NetEnergyCard } from '../health/NetEnergyCard';
import { calculateDynamicHydration, type NetEnergyGoal } from '@vanguard/domain';

export function OuraNutritionFuelingView({data}:{data:OuraHealthHubData}) {
  const [netEnergyGoal, setNetEnergyGoal] = useState<NetEnergyGoal>('maintenance');
  const nutrition = data.nutrition;
  const userId = data.userId ?? data.strainRow?.user_id ?? data.oura?.user_id ?? '';
  const date = data.date || nutrition?.date || getTodayWarsaw();

  if (data.nutritionError) return <DataStateNotice title="Nie udało się odczytać żywienia" detail={data.nutritionError} />;
  if (!nutrition || nutrition.foodDataState === 'missing') {
    return (
      <div className="space-y-4 pb-8">
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

  const proteinRemaining = nutrition.targetProtein == null ? null : Math.max(0, nutrition.targetProtein - nutrition.protein);
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
    {nutrition.targetError && <DataStateNotice title="Nie udało się odświeżyć celu żywienia" detail={nutrition.targetError}/>}
    <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-3">
      <h2 className="font-bold">Paliwo · {nutrition.date}</h2>
      <p className="text-sm">Zapisano {nutrition.calories} kcal · {nutrition.protein} g białka</p>
      <p className="text-sm">Cel energii: {nutrition.targetKcal == null ? 'brak aktualnego celu' : `${nutrition.targetKcal} kcal (szacunek)`}</p>
      <p className="text-sm">Cel białka: {nutrition.targetProtein == null ? 'potrzebny aktualny pomiar masy' : `${nutrition.targetProtein} g`}</p>
      {proteinRemaining != null && <p className="text-xs text-text-secondary">Do ustalonego celu białka pozostało {Math.round(proteinRemaining)} g. Ten wskaźnik nie mierzy regeneracji mięśni.</p>}
      <p className="text-xs text-text-secondary">{nutrition.foodComplete ? 'Dzień potwierdzony jako kompletny.' : 'Dziennik nie jest zamknięty. Bieżące sumy nie oznaczają ostatecznego bilansu dnia.'}</p>
      {nutrition.todayFocus && <p className="text-sm">{nutrition.todayFocus}</p>}
      <p className="text-xs text-text-secondary">{nutrition.trainingLabel}</p>
    </section>

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

