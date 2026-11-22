import { Check, Package } from 'lucide-react';
import type { MealPlanDraft } from '@vanguard/domain';
import { mealShoppingList } from '@vanguard/domain';
import Button from '../../ui/Button';

interface MealShoppingListViewProps {
  plan: MealPlanDraft;
  checkedIds: string[];
  onToggle: (productId: string) => void;
  disabled?: boolean;
}

export function MealShoppingListView({ plan, checkedIds, onToggle, disabled }: MealShoppingListViewProps) {
  const items = mealShoppingList(plan);
  const products = new Map(
    plan.days.flatMap(day => day.meals.flatMap(meal =>
      meal.ingredients.map(({ product }) => [product.id, product] as const),
    )),
  );
  const checkedSet = new Set(checkedIds);
  const remaining = items.filter(item => !checkedSet.has(item.productId));
  const bought = items.filter(item => checkedSet.has(item.productId));

  return (
    <div className="meal-planner space-y-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wide text-text-muted">Lista zakupów</p>
          <p className="mt-0.5 text-sm text-text-secondary">Z aktywnego planu · {bought.length}/{items.length}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl bg-surface-2 p-4 text-sm text-text-secondary">Brak produktów w wybranym planie.</p>
      ) : (
        <div className="meal-planner-canvas">
          {remaining.map(item => {
            const product = products.get(item.productId);
            return (
              <Button
                key={item.productId}
                variant="ghost"
                onClick={() => onToggle(item.productId)}
                disabled={disabled}
                className="meal-planner-card h-auto w-full justify-start gap-3 p-3 text-left font-normal hover:bg-surface-solid"
              >
                <span className="meal-planner-thumb !h-12 !w-12 !rounded-xl" aria-hidden="true">
                  <Package size={18} strokeWidth={1.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text-primary">{item.name}</span>
                  {product && (
                    <span className="mt-0.5 block text-2xs tabular-nums text-text-muted">
                      {product.verified ? 'Na 100 g' : 'Szacunek / 100 g'} · {product.calories} kcal · B {product.protein} g
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-text-primary">
                  {item.grams >= 1000 ? `${(item.grams / 1000).toFixed(1)} kg` : `${Math.round(item.grams)} g`}
                </span>
              </Button>
            );
          })}

          {bought.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="px-1 text-2xs font-semibold uppercase tracking-wide text-text-muted">Kupione</p>
              {bought.map(item => (
                <Button
                  key={item.productId}
                  variant="ghost"
                  onClick={() => onToggle(item.productId)}
                  disabled={disabled}
                  className="flex h-auto w-full items-center justify-between rounded-xl bg-surface/60 px-3 py-2 text-left font-normal text-text-muted"
                >
                  <span className="inline-flex items-center gap-2">
                    <Check size={16} className="text-success" />
                    <span className="text-sm line-through">{item.name}</span>
                  </span>
                  <span className="text-xs tabular-nums">
                    {item.grams >= 1000 ? `${(item.grams / 1000).toFixed(1)} kg` : `${Math.round(item.grams)} g`}
                  </span>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
