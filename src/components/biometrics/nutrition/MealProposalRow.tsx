import { Check, ChevronDown, Clock, Plus } from 'lucide-react';
import type { PlannedMeal } from '@vanguard/domain';
import Button from '../../ui/Button';
import MealIllustration from './MealIllustration';
import { PlannedMealCard } from './PlannedMealCard';
import { mealSlotLabel } from './mealSlotLabel';

const format = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });

interface Props {
  meal: PlannedMeal;
  draft: boolean;
  picked: boolean;
  busy?: boolean;
  onToggle?: () => void;
  onResizeMeal: (mealKey: string, factor: number) => void;
}

export function MealProposalRow({ meal, draft, picked, busy, onToggle, onResizeMeal }: Props) {
  const protein = Math.round(meal.totals.protein);
  const calories = Math.round(meal.totals.calories);

  return (
    <article className="meal-planner-card" data-picked={picked || undefined}>
      <div className="flex items-start gap-3">
        <MealIllustration meal={meal} variant="thumb" />

        <details className="group min-w-0 flex-1">
          <summary className="flex min-h-14 cursor-pointer list-none items-start justify-between gap-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 space-y-1.5 pt-0.5">
              <span className="meal-planner-slot">{mealSlotLabel(meal.key)}</span>
              <span className="block text-sm font-semibold leading-snug tracking-tight text-text-primary">
                {meal.name}
              </span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums text-text-secondary">
                <span className="font-medium text-text-primary">{format.format(protein)} g B</span>
                <span aria-hidden="true">·</span>
                <span>{format.format(calories)} kcal</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} className="text-text-muted" />
                  {meal.prepMinutes} min
                </span>
              </span>
            </span>
            <ChevronDown
              size={18}
              className="mt-1 shrink-0 text-text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div className="pt-4">
            <PlannedMealCard meal={meal} onResizeMeal={onResizeMeal} disabled={busy} />
          </div>
        </details>

        {draft && onToggle && (
          <Button
            variant={picked ? 'tonal' : 'secondary'}
            size="sm"
            className="mt-1 h-11 w-11 shrink-0 rounded-full p-0"
            role="checkbox"
            aria-label={`Wybierz: ${meal.name}`}
            aria-checked={picked}
            disabled={busy}
            onClick={onToggle}
            icon={picked ? <Check size={18} /> : <Plus size={18} />}
          />
        )}
      </div>
    </article>
  );
}
