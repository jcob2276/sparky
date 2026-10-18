import { Coffee, Moon, Target, Utensils } from 'lucide-react';
import type { NutritionDayContext } from '../../../lib/health/nutritionContext';
import type { OuraHealthHubData } from './types';
import MacroProgressBar from '../../core/nutrition/MacroProgressBar';
import { shiftDateStr, warsawTimeOfDay } from '../../../lib/date';

export interface OuraNutritionEnergyProps {
  nutrition: NutritionDayContext;
  data: OuraHealthHubData;
  date: string;
}

interface CalorieTargetSectionProps {
  nutrition: NutritionDayContext;
  calorieDelta: number | null;
  proteinRemaining: number | null;
}

function CalorieTargetSection({ nutrition, calorieDelta, proteinRemaining }: CalorieTargetSectionProps) {
  return (
    <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2">
          <Target size={18} className="text-primary" />
          Paliwo · {nutrition.date}
        </h2>
        <span className="text-xs text-text-muted">{nutrition.foodComplete ? 'Dzień kompletny' : 'Dziennik w toku'}</span>
      </div>

      <p className="text-sm">Zapisano {nutrition.calories} kcal · {nutrition.protein} g białka</p>
      <p className="text-sm">Cel energii: {nutrition.targetKcal == null ? 'brak aktualnego celu' : `${nutrition.targetKcal} kcal (szacunek)`}</p>
      <p className="text-sm">Cel białka: {nutrition.targetProtein == null ? 'potrzebny aktualny pomiar masy' : `${nutrition.targetProtein} g`}</p>

      {calorieDelta != null && (
        <div className="rounded-xl bg-surface-2 p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-text-secondary">Realizacja celu energii</span>
            <span className="font-medium text-text-primary">
              {calorieDelta >= 0 ? `Pozostało ${calorieDelta} kcal` : `Przekroczono o ${Math.abs(calorieDelta)} kcal`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border-custom/40">
            <div
              className={`h-full transition-all ${calorieDelta < 0 ? 'bg-warning' : 'bg-primary'}`}
              style={{ width: `${Math.min(100, Math.round((nutrition.calories / Math.max(1, nutrition.targetKcal!)) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {proteinRemaining != null && (
        <p className="text-xs text-text-secondary">
          Do ustalonego celu białka pozostało {Math.round(proteinRemaining)} g. Ten wskaźnik nie mierzy regeneracji mięśni.
        </p>
      )}

      <p className="text-xs text-text-secondary">
        {nutrition.foodComplete ? 'Dzień potwierdzony jako kompletny.' : 'Dziennik nie jest zamknięty. Bieżące sumy nie oznaczają ostatecznego bilansu dnia.'}
      </p>
      {nutrition.todayFocus && <p className="text-sm">{nutrition.todayFocus}</p>}
      <p className="text-xs text-text-secondary">{nutrition.trainingLabel}</p>
    </section>
  );
}

interface MacroSplitSectionProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  targetKcal: number | null;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

function MacroSplitSection({
  calories,
  protein,
  carbs,
  fat,
  targetKcal,
  proteinPct,
  carbsPct,
  fatPct,
}: MacroSplitSectionProps) {
  return (
    <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-3">
      <h3 className="text-sm font-semibold text-text-primary">Podział makroskładników</h3>
      <MacroProgressBar
        calories={calories}
        protein={protein}
        carbs={carbs}
        fat={fat}
        targetKcal={targetKcal ?? Math.max(1, calories)}
      />
      <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
        <div className="rounded-lg bg-surface-2 p-2">
          <p className="text-3xs text-text-muted">Białko (4 kcal/g)</p>
          <p className="font-semibold text-primary">{Math.round(protein)} g</p>
          <p className="text-3xs text-text-secondary">{proteinPct}% energii</p>
        </div>
        <div className="rounded-lg bg-surface-2 p-2">
          <p className="text-3xs text-text-muted">Węgle (4 kcal/g)</p>
          <p className="font-semibold text-success">{Math.round(carbs)} g</p>
          <p className="text-3xs text-text-secondary">{carbsPct}% energii</p>
        </div>
        <div className="rounded-lg bg-surface-2 p-2">
          <p className="text-3xs text-text-muted">Tłuszcze (9 kcal/g)</p>
          <p className="font-semibold text-warning">{Math.round(fat)} g</p>
          <p className="text-3xs text-text-secondary">{fatPct}% energii</p>
        </div>
      </div>
    </section>
  );
}

interface MealTimingSectionProps {
  contextDate: string | null;
  sleepDate: string;
  lastMealAt: string | null;
  mealHoursBeforeBedtime: number | null;
  bedtimeStart: string | null;
  lastCaffeineAt: string | null;
  caffeineMg: number | null;
  remainingCaffeineMg: number | null;
}

function MealTimingSection({
  contextDate,
  sleepDate,
  lastMealAt,
  mealHoursBeforeBedtime,
  bedtimeStart,
  lastCaffeineAt,
  caffeineMg,
  remainingCaffeineMg,
}: MealTimingSectionProps) {
  return (
    <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-3">
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <Moon size={16} className="text-primary" />
        Timing posiłków i kofeiny a sen
      </h3>

      <p className="text-xs text-text-secondary">
        {contextDate ? `Zapisy z ${contextDate} → noc zakończona ${sleepDate}. Godziny dotyczą wpisów, nie potwierdzonego czasu spożycia.`
          : `Noc zakończona ${sleepDate}. Brak kontekstu wpisów powiązanego z tą nocą.`}
      </p>

      <div className="grid gap-2 sm:grid-cols-2 text-xs">
        <div className="rounded-xl bg-surface-2 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Utensils size={14} className="text-success" />
            <span className="font-medium">Ostatni wpis jedzenia przed snem</span>
          </div>
          <p className="text-sm font-semibold text-text-primary">
            {lastMealAt ? `Ostatni wpis: ${lastMealAt}` : 'Brak wpisów przed snem z ustaloną godziną'}
          </p>
          {mealHoursBeforeBedtime != null ? (
            <p className="text-text-secondary">
              Wpis {mealHoursBeforeBedtime}h przed początkiem snu
            </p>
          ) : bedtimeStart ? (
            <p className="text-text-muted">Początek snu: {warsawTimeOfDay(bedtimeStart)}</p>
          ) : (
            <p className="text-text-muted">Początek snu pojawi się po zsynchronizowaniu nocy.</p>
          )}
        </div>

        <div className="rounded-xl bg-surface-2 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Coffee size={14} className="text-warning" />
            <span className="font-medium">Kofeina & Half-life</span>
          </div>
          <p className="text-sm font-semibold text-text-primary">
            {lastCaffeineAt ? `Ostatni wpis kofeiny: ${lastCaffeineAt}` : 'Brak wpisów kofeiny przed początkiem snu z ustaloną godziną'}
          </p>
          {caffeineMg != null && <p>Łącznie we wpisach: ~{caffeineMg} mg (szacunek)</p>}
          {remainingCaffeineMg != null ? (
            <p className="text-warning font-medium">
              ~{remainingCaffeineMg} mg przy początku snu, jeśli spożycie nastąpiło w chwili wpisu (model T½ ~5.5h)
            </p>
          ) : (
            <p className="text-text-muted">Model rozpadu T½ ~5.5h</p>
          )}
          <p className="text-3xs text-text-muted leading-relaxed">
            Szacunek na podstawie wpisów w dzienniku — brak bezpośredniego pomiaru stężenia we krwi.
          </p>
        </div>
      </div>
    </section>
  );
}

export function OuraNutritionEnergy({ nutrition, data, date }: OuraNutritionEnergyProps) {
  const proteinRemaining = nutrition.targetProtein == null ? null : Math.max(0, nutrition.targetProtein - nutrition.protein);
  const calorieDelta = nutrition.targetKcal == null ? null : nutrition.targetKcal - nutrition.calories;

  // Macros
  const protein = nutrition.protein ?? 0;
  const carbs = nutrition.carbs ?? 0;
  const fat = nutrition.fat ?? 0;
  const proteinKcal = protein * 4;
  const carbsKcal = carbs * 4;
  const fatKcal = fat * 9;
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal;

  const proteinPct = totalMacroKcal > 0 ? Math.round((proteinKcal / totalMacroKcal) * 100) : 0;
  const carbsPct = totalMacroKcal > 0 ? Math.round((carbsKcal / totalMacroKcal) * 100) : 0;
  const fatPct = totalMacroKcal > 0 ? Math.round((fatKcal / totalMacroKcal) * 100) : 0;

  const bedtimeStart = data.enhanced?.date === date ? data.enhanced.bedtime_start
    : data.oura?.date === date ? data.oura.bedtime_timestamp
    : null;
  // A completed night belongs to its wake date; today's food cannot explain it.
  const nightContext = data.nightContext;
  const contextForNight = bedtimeStart && nightContext?.bedtimeStart
    && nightContext.date === shiftDateStr(date, -1)
    && Date.parse(nightContext.bedtimeStart) === Date.parse(bedtimeStart)
    ? nightContext : null;

  return (
    <div className="space-y-4">
      <CalorieTargetSection
        nutrition={nutrition}
        calorieDelta={calorieDelta}
        proteinRemaining={proteinRemaining}
      />
      <MacroSplitSection
        calories={nutrition.calories}
        protein={protein}
        carbs={carbs}
        fat={fat}
        targetKcal={nutrition.targetKcal}
        proteinPct={proteinPct}
        carbsPct={carbsPct}
        fatPct={fatPct}
      />
      <MealTimingSection
        contextDate={contextForNight?.date ?? null}
        sleepDate={date}
        lastMealAt={contextForNight?.meals.lastAt ?? null}
        mealHoursBeforeBedtime={contextForNight?.meals.hoursBeforeBedtime ?? null}
        bedtimeStart={bedtimeStart}
        lastCaffeineAt={contextForNight?.caffeine.lastAt ?? null}
        caffeineMg={contextForNight?.caffeine.amountMg ?? null}
        remainingCaffeineMg={contextForNight?.caffeine.remainingMgAtBedtime ?? null}
      />
    </div>
  );
}
