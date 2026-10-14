import { useState } from 'react';
import { ChefHat, Check, Sparkles, AlertCircle } from 'lucide-react';
import type { MealPlanDraft, MealPlanState } from '@vanguard/domain';
import { MealShoppingListView } from './MealShoppingListView';
import { PlannedMealCard } from './PlannedMealCard';
import Button from '../../ui/Button';

interface MealPlannerViewProps {
  date: string;
  state: MealPlanState | null;
  targetKcal: number | null;
  targetProtein: number | null;
  isGenerating: boolean;
  isApproving: boolean;
  onGenerate: () => void;
  onApprove: () => void;
  onResizeMeal: (mealKey: string, factor: number) => void;
  onToggleShoppingItem: (productId: string) => void;
}

export function MealPlannerView({
  date,
  state,
  targetKcal,
  targetProtein,
  isGenerating,
  isApproving,
  onGenerate,
  onApprove,
  onResizeMeal,
  onToggleShoppingItem,
}: MealPlannerViewProps) {
  const [tab, setTab] = useState<'meals' | 'shopping'>('meals');

  const activePlan: MealPlanDraft | null = state?.active ?? null;
  const draftPlan: MealPlanDraft | null = state?.draft ?? null;
  const displayPlan = activePlan ?? draftPlan;

  const currentDay = displayPlan?.days.find((d) => d.date === date) ?? displayPlan?.days[0];
  const isDraftOnly = !activePlan && Boolean(draftPlan);

  return (
    <div className="rounded-2xl border border-white/5 bg-surface-1 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <ChefHat size={18} className="text-primary" />
            Jadłospis i lista zakupów
          </h3>
          <p className="text-xs text-text-muted">
            Plan posiłków pod trening i cele. Planowanie nie zapisuje spożycia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-surface-2 p-0.5 border border-white/5">
            <Button
              variant={tab === 'meals' ? 'tonal' : 'ghost'}
              size="sm"
              onClick={() => setTab('meals')}
              className="h-7 px-3 text-xs"
            >
              Posiłki
            </Button>
            <Button
              variant={tab === 'shopping' ? 'tonal' : 'ghost'}
              size="sm"
              onClick={() => setTab('shopping')}
              className="h-7 px-3 text-xs"
            >
              Zakupy
            </Button>
          </div>

          <Button
            variant="tonal"
            size="sm"
            onClick={onGenerate}
            disabled={isGenerating}
            loading={isGenerating}
            icon={<Sparkles size={14} className={isGenerating ? 'animate-spin' : ''} />}
            className="h-8 border border-primary/30"
          >
            {isGenerating ? 'Dobieram…' : displayPlan ? 'Przelicz menu' : 'Ułóż jadłospis'}
          </Button>
        </div>
      </div>

      {!displayPlan ? (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center space-y-2">
          <p className="text-sm font-medium text-text-primary">Brak zaplanowanego jadłospisu na ten dzień</p>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            Sparky może ułożyć proste, pełnowartościowe posiłki dopasowane do Twojego celu energii ({targetKcal ?? 2200} kcal) i białka ({targetProtein ?? 140} g) ze zweryfikowanych produktów.
          </p>
        </div>
      ) : tab === 'shopping' ? (
        <MealShoppingListView
          plan={displayPlan}
          checkedIds={state?.checkedProducts ?? []}
          onToggle={onToggleShoppingItem}
        />
      ) : (
        <div className="space-y-4">
          {isDraftOnly && (
            <div className="flex items-center justify-between rounded-xl border border-warning/20 bg-warning/5 p-3">
              <div className="flex items-center gap-2 text-xs text-warning">
                <AlertCircle size={16} />
                <span>To jest szkic jadłospisu. Zatwierdź, aby aktywować plan i listę zakupów.</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={onApprove}
                disabled={isApproving}
                loading={isApproving}
                icon={<Check size={14} />}
                className="h-7 px-3 text-xs"
              >
                {isApproving ? 'Zatwierdzam…' : 'Zatwierdź menu'}
              </Button>
            </div>
          )}

          {currentDay && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary bg-surface-2 p-2.5 rounded-xl border border-white/5">
                <span>
                  Suma dnia: <strong className="text-text-primary font-semibold">{currentDay.totals.calories} kcal</strong> (cel: {currentDay.target.calories} kcal)
                </span>
                <span>
                  Białko: <strong className="text-text-primary font-semibold">{currentDay.totals.protein} g</strong> (cel: {currentDay.target.protein} g)
                </span>
                <span>Węgle: {currentDay.totals.carbs} g · Tłuszcz: {currentDay.totals.fat} g</span>
              </div>

              <div className="space-y-3">
                {currentDay.meals.map((meal) => (
                  <PlannedMealCard
                    key={meal.key}
                    meal={meal}
                    onResizeMeal={onResizeMeal}
                  />
                ))}
              </div>
            </div>
          )}

          {displayPlan.warnings && displayPlan.warnings.length > 0 && (
            <div className="space-y-1 pt-1">
              {displayPlan.warnings.map((w, idx) => (
                <p key={idx} className="text-2xs text-text-muted">
                  ⚠️ {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
