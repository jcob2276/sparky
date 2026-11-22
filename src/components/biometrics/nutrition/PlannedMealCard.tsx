import { Clock, Scale } from 'lucide-react';
import type { PlannedMeal } from '@vanguard/domain';
import MealIllustration from './MealIllustration';
import Button from '../../ui/Button';
import { GlycemicEstimate } from './GlycemicEstimate';
import { mealSlotLabel } from './mealSlotLabel';

interface PlannedMealCardProps {
  meal: PlannedMeal;
  onResizeMeal: (mealKey: string, factor: number) => void;
  disabled?: boolean;
}

const SCALE_FACTORS = [0.75, 1, 1.25, 1.5];
const format = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });

export function PlannedMealCard({ meal, onResizeMeal, disabled }: PlannedMealCardProps) {
  const macros = [
    { id: 'protein', label: `${format.format(meal.totals.protein)} g B` },
    { id: 'calories', label: `${format.format(meal.totals.calories)} kcal` },
    { id: 'carbs', label: `${format.format(meal.totals.carbs)} g W` },
    { id: 'fat', label: `${format.format(meal.totals.fat)} g T` },
  ] as const;

  return (
    <article className="space-y-4">
      <MealIllustration meal={meal} />

      <div className="space-y-2 text-center">
        <p className="text-2xs font-semibold uppercase tracking-wide text-text-muted">
          {mealSlotLabel(meal.key)}
        </p>
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-text-primary">{meal.name}</h3>
        <p className="inline-flex items-center justify-center gap-1 text-xs text-text-secondary">
          <Clock size={13} /> {meal.prepMinutes} min
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {macros.map(macro => (
          <span
            key={macro.id}
            className="meal-macro rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold tabular-nums"
            data-macro={macro.id === 'calories' ? undefined : macro.id}
          >
            <span className={macro.id === 'calories' ? 'text-text-secondary' : 'meal-macro-label'}>{macro.label}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Scale size={13} className="text-text-muted" />
        <span className="text-2xs text-text-muted mr-1">Porcja:</span>
        {SCALE_FACTORS.map(factor => (
          <Button
            key={factor}
            variant="secondary"
            size="sm"
            onClick={() => onResizeMeal(meal.key, factor)}
            disabled={disabled}
            className="h-7 min-w-0 px-2 py-0 text-2xs font-medium"
          >
            {factor}x
          </Button>
        ))}
      </div>

      <div className="rounded-xl bg-surface-2 p-3">
        <p className="text-2xs font-semibold uppercase tracking-wide text-text-muted">Składniki</p>
        <ul className="mt-2 space-y-2">
          {meal.ingredients.map(ing => (
            <li key={ing.product.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 text-xs">
              <span className="min-w-0 truncate text-text-secondary">{ing.product.name}</span>
              <span className="shrink-0 whitespace-nowrap tabular-nums text-text-muted">
                {format.format(ing.grams)} g · {format.format(ing.macros.calories)} kcal
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl bg-surface-2 p-3">
        <p className="text-2xs font-semibold uppercase tracking-wide text-text-muted">Przygotowanie</p>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{meal.instructions}</p>
      </div>

      <GlycemicEstimate
        items={meal.ingredients.map(item => ({
          id: item.product.id,
          name: item.product.name,
          grams: item.grams,
          carbs: item.macros.carbs,
          fiber: item.macros.fiber,
        }))}
      />
    </article>
  );
}
