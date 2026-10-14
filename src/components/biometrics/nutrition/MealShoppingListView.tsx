import { CheckCircle2, Circle, ShoppingBag } from 'lucide-react';
import type { MealPlanDraft } from '@vanguard/domain';
import { mealShoppingList } from '@vanguard/domain';
import Button from '../../ui/Button';

interface MealShoppingListViewProps {
  plan: MealPlanDraft;
  checkedIds: string[];
  onToggle: (productId: string) => void;
}

export function MealShoppingListView({ plan, checkedIds, onToggle }: MealShoppingListViewProps) {
  const items = mealShoppingList(plan);
  const checkedSet = new Set(checkedIds);

  const remaining = items.filter((i) => !checkedSet.has(i.productId));
  const bought = items.filter((i) => checkedSet.has(i.productId));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <ShoppingBag size={16} className="text-primary" />
          Lista zakupów ({bought.length}/{items.length})
        </h4>
        <span className="text-xs text-text-muted">
          Pochodna z zaakceptowanego menu
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-text-muted">Brak produktów w wybranym planie.</p>
      ) : (
        <div className="space-y-2">
          {remaining.map((item) => (
            <Button
              key={item.productId}
              variant="ghost"
              onClick={() => onToggle(item.productId)}
              className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-left transition hover:border-white/10 h-auto font-normal"
            >
              <div className="flex items-center gap-2">
                <Circle size={16} className="text-text-muted" />
                <span className="text-sm font-medium text-text-primary">{item.name}</span>
              </div>
              <span className="text-xs tabular-nums text-text-secondary">
                {item.grams >= 1000 ? `${(item.grams / 1000).toFixed(1)} kg` : `${Math.round(item.grams)} g`}
              </span>
            </Button>
          ))}

          {bought.length > 0 && (
            <div className="pt-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Kupione ({bought.length})
              </p>
              <div className="space-y-1 opacity-60">
                {bought.map((item) => (
                  <Button
                    key={item.productId}
                    variant="ghost"
                    onClick={() => onToggle(item.productId)}
                    className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-surface-1 px-3 py-1.5 text-left transition hover:opacity-100 h-auto font-normal"
                  >
                    <div className="flex items-center gap-2 line-through text-text-muted">
                      <CheckCircle2 size={16} className="text-success" />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-xs tabular-nums text-text-muted">
                      {item.grams >= 1000 ? `${(item.grams / 1000).toFixed(1)} kg` : `${Math.round(item.grams)} g`}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
