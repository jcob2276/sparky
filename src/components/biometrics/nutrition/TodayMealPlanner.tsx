import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { selectPlannedMeals } from '@vanguard/domain';
import { MEAL_TYPES, type MealTypeId } from '../../../lib/health/foodLogging';
import Button from '../../ui/Button';
import { ControlInput } from '../../ui/ControlPrimitives';
import { MealProposalRow } from './MealProposalRow';
import { MealShoppingListView } from './MealShoppingListView';
import { mealFocusPrompt } from './mealSlotLabel';
import type { MealPlannerViewProps } from './MealPlannerView';

const format = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });
/** Poniżej tylu pozostałych kcal nie da się sensownie ułożyć posiłku, więc nie pytamy modelu. */
const MIN_PLAN_KCAL = 150;

function LowBudgetNote({ remaining }: { remaining: number | null }) {
  return (
    <p role="note" className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
      {remaining != null && remaining > 0 ? `Zostało tylko ${remaining} kcal` : 'Cel kalorii na dziś jest już osiągnięty'}, więc nie ułożę z tego pełnego posiłku. Zakładka „Dopełnij” dobierze chude produkty z Twoich ulubionych.
    </p>
  );
}

export function TodayMealPlanner({
  date, state, logged, targetKcal, targetProtein, canGenerate = true, preferences,
  busy, isGenerating, generationError, approvalError, isApproving, onGenerate, onApprove, onResizeMeal,
  onToggleShoppingItem, reviewIdentity, mealFocus, onMealFocus,
}: MealPlannerViewProps) {
  const [shopping, setShopping] = useState(false);
  const [selection, setSelection] = useState<{key:string; meals:string[]}>();
  const [reviewedKey, setReviewedKey] = useState<string>();
  const remainingKcal = targetKcal != null && logged ? Math.round(targetKcal - logged.calories) : null;
  const tooLittleLeft = remainingKcal != null && remainingKcal < MIN_PLAN_KCAL;
  const draft = state?.draft;
  const active = state?.active;
  const plan = draft ?? active;
  const day = plan?.days.find(row => row.date === date);
  const key = JSON.stringify([reviewIdentity, date, state?.requestKey]);
  const selected = selection?.key === key ? selection.meals : [];
  const preview = day && (draft ? selectPlannedMeals(day, selected) : day);
  const needsReview = Boolean(preferences?.allergies.length);
  const reviewKey = JSON.stringify([key, state?.revision, selected]);
  const reviewed = reviewedKey === reviewKey;
  const changedPreferences = Boolean(draft && preferences && draft.preferencesRevision !== preferences.revision);
  const hasSelection = selected.length > 0;
  const dayCalories = Math.round((logged?.calories ?? 0) + (preview?.totals.calories ?? 0));
  const dayProtein = Math.round((logged?.protein ?? 0) + (preview?.totals.protein ?? 0));
  const plannedCalories = Math.round(preview?.totals.calories ?? day?.totals.calories ?? 0);
  const plannedProtein = Math.round(preview?.totals.protein ?? day?.totals.protein ?? 0);
  const focus = mealFocus && MEAL_TYPES.some(type => type.id === mealFocus) ? mealFocus as MealTypeId : undefined;

  return (
    <section className="meal-planner">
      <div className="flex items-center justify-between gap-2">
        <div className="meal-segment flex" role="group" aria-label="Widok planu">
          <Button size="sm" className="meal-segment-item" variant="ghost" aria-pressed={!shopping} onClick={() => setShopping(false)}>Posiłki</Button>
          <Button size="sm" className="meal-segment-item" variant="ghost" aria-pressed={shopping} onClick={() => setShopping(true)}>Zakupy</Button>
        </div>
        {!shopping && day && (
          <Button size="sm" variant="ghost" onClick={onGenerate} loading={isGenerating}
            disabled={busy || isGenerating || !canGenerate} icon={<Sparkles size={16}/>}>Nowy plan</Button>
        )}
      </div>

      {shopping ? (
        active
          ? <MealShoppingListView plan={active} checkedIds={state?.checkedProducts ?? []} onToggle={onToggleShoppingItem} disabled={busy}/>
          : <p className="rounded-xl bg-surface-2 p-4 text-sm text-text-secondary">Dodaj posiłek do planu, a jego składniki pojawią się tutaj.</p>
      ) : (
        <>
          {onMealFocus && (
            <div className="meal-chips -mx-1 flex gap-1.5 overflow-x-auto px-1" role="group" aria-label="Typ posiłku">
              {MEAL_TYPES.map(type => (
                <Button
                  key={type.id}
                  size="sm"
                  variant="ghost"
                  className="meal-chip"
                  aria-pressed={focus === type.id}
                  disabled={busy || isGenerating}
                  onClick={() => onMealFocus(type.id)}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          )}

          {isGenerating && (
            <p role="status" className="text-sm text-text-secondary">
              {focus ? `Układam ${mealFocusPrompt(focus)} na resztę dnia…` : 'Układam posiłki na resztę dnia…'}
            </p>
          )}
          {generationError && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{generationError}</p>}
          {!day ? (
            <div className="meal-planner-card space-y-3">
              <div>
                <p className="text-base font-semibold tracking-tight text-text-primary">🍽️ Brak planu na dziś</p>
                <p className="mt-1 text-sm text-text-secondary">
                  {focus
                    ? `Propozycja ${mealFocusPrompt(focus)} uwzględni zjedzone dziś i pozostały budżet.`
                    : 'Propozycje uwzględnią zjedzone dziś i pozostały budżet.'}
                </p>
              </div>
              {tooLittleLeft && <LowBudgetNote remaining={remainingKcal} />}
              <Button className="meal-planner-cta" variant="neutral" onClick={onGenerate} loading={isGenerating}
                disabled={busy || isGenerating || !canGenerate || tooLittleLeft} icon={<Sparkles size={16}/>}>
                {focus ? `Ułóż ${mealFocusPrompt(focus)}` : 'Ułóż plan na resztę dnia'}
              </Button>
            </div>
          ) : (
            <div className="meal-planner-canvas">
              <div className="flex items-end justify-between gap-3 px-1">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wide text-text-muted">
                    {draft ? 'Propozycje' : 'Zaplanowane'}
                  </p>
                  {draft && <p className="mt-0.5 text-sm text-text-secondary">Wybierz, co chcesz dodać do planu</p>}
                </div>
                <p className="text-sm font-semibold tabular-nums text-text-primary">
                  {format.format(plannedProtein)} g B
                  <span className="font-normal text-text-secondary"> · {format.format(plannedCalories)} kcal</span>
                </p>
              </div>

              {day.meals.map(meal => {
                const picked = selected.includes(meal.key);
                return (
                  <MealProposalRow
                    key={meal.key}
                    meal={meal}
                    draft={Boolean(draft)}
                    picked={picked}
                    busy={busy}
                    onToggle={draft ? () => setSelection({
                      key,
                      meals: picked ? selected.filter(value => value !== meal.key) : [...selected, meal.key],
                    }) : undefined}
                    onResizeMeal={(mealKey, factor) => onResizeMeal(mealKey, factor, day.date)}
                  />
                );
              })}

              {plan?.warnings.length ? (
                <details className="px-1 text-xs text-text-secondary">
                  <summary className="cursor-pointer">Informacje o makro i składnikach</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-4">{plan.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
                </details>
              ) : null}

              {draft && (
                <footer className="sticky bottom-0 z-20 mt-4 -mx-5 -mb-5 space-y-2.5 border-t border-border-custom/30 bg-surface-solid/95 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-md shadow-lg">
                  {changedPreferences && <p role="status" className="text-xs text-warning">Preferencje się zmieniły. Ułóż nowy plan.</p>}
                  {approvalError && <p role="alert" className="text-xs text-danger">{approvalError}</p>}
                  {hasSelection && needsReview && <label className="flex items-start gap-2 text-xs">
                    <ControlInput type="checkbox" checked={reviewed} onChange={event => setReviewedKey(event.target.checked ? reviewKey : undefined)}/>
                    Sprawdziłem skład wybranych produktów pod kątem alergii.
                  </label>}
                  {hasSelection && <div className="flex flex-wrap justify-between gap-2 text-xs text-text-secondary">
                    <span>Wybrane: <strong className="text-text-primary">{format.format(preview?.totals.calories ?? 0)} kcal</strong></span>
                    <span>Po zjedzeniu: <strong className="text-text-primary">{dayCalories}{targetKcal ? ` / ${targetKcal}` : ''} kcal</strong> · {dayProtein}{targetProtein ? ` / ${targetProtein}` : ''} g białka</span>
                  </div>}
                  <Button className="meal-planner-cta" variant="neutral" loading={isApproving}
                    disabled={!hasSelection || busy || changedPreferences || !canGenerate || needsReview && !reviewed}
                    onClick={() => onApprove(needsReview ? reviewed : undefined,{date:day.date,mealKeys:selected})}>
                    {isApproving ? 'Zapisuję…' : `Dodaj wybrane (${selected.length})`}
                  </Button>
                </footer>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
