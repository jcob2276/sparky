import type { OuraHealthHubData } from './types';
import DataStateNotice from '../../core/DataStateNotice';
import { MealPlannerContainer } from '../nutrition/MealPlannerContainer';
import { getTodayWarsaw } from '../../../lib/date';
import FoodPlanningAssistantContainer from '../nutrition/FoodPlanningAssistantContainer';

export function OuraNutritionFuelingView({data}:{data:OuraHealthHubData}) {
  const nutrition = data.nutrition;
  const userId = data.userId ?? data.strainRow?.user_id ?? data.oura?.user_id ?? '';
  const date = data.date || nutrition?.date || getTodayWarsaw();

  if (data.nutritionError) return <DataStateNotice title="Nie udało się odczytać żywienia" detail={data.nutritionError} />;
  if (!nutrition || nutrition.foodDataState === 'missing') {
    return (
      <div className="space-y-4 pb-8">
        <DataStateNotice title="Brak dziennika jedzenia" detail={`Brak wpisów dla ${data.date ?? 'wybranego dnia'}. Dodaj faktycznie zjedzony posiłek w zakładce Jedzenie.`} />
        {userId && <FoodPlanningAssistantContainer userId={userId} />}
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

  const proteinRemaining = nutrition.targetProtein == null ? null : Math.max(0,nutrition.targetProtein-nutrition.protein);
  return <div className="space-y-4 pb-8">
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

    {userId && (
      <MealPlannerContainer
        userId={userId}
        date={date}
        targetKcal={nutrition.targetKcal}
        targetProtein={nutrition.targetProtein}
      />
    )}
    {userId && <FoodPlanningAssistantContainer userId={userId} />}

    <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-2">
      <h3 className="font-semibold">Źródła i ograniczenia</h3>
      <p className="text-xs text-text-secondary">Spożycie pochodzi z dziennika jedzenia, cele z planu żywienia tego samego dnia. Wydatek zegarka i zapotrzebowanie są szacunkami.</p>
      <p className="text-xs text-text-secondary">Brak pomiaru nawodnienia i stężenia kofeiny we krwi. Dziennik nie pozwala samodzielnie rozpoznać niedoboru składników odżywczych.</p>
    </section>
  </div>;
}

