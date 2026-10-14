import { Clock, Scale } from 'lucide-react';
import type { PlannedMeal } from '@vanguard/domain';
import Button from '../../ui/Button';
import {GlycemicEstimate} from './GlycemicEstimate';

interface PlannedMealCardProps {
  meal: PlannedMeal;
  onResizeMeal: (mealKey: string, factor: number) => void;
  disabled?:boolean;
}

const SCALE_FACTORS = [0.75, 1, 1.25, 1.5];

export function PlannedMealCard({ meal, onResizeMeal,disabled }: PlannedMealCardProps) {
  return (
    <article className="rounded-xl border border-white/5 bg-surface-2 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">{meal.name}</span>
          <span className="flex items-center gap-1 text-2xs text-text-muted">
            <Clock size={12} /> {meal.prepMinutes} min
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Scale size={13} className="text-text-muted" />
          <span className="text-2xs text-text-muted mr-1">Względem porcji bazowej:</span>
          {SCALE_FACTORS.map((factor) => (
            <Button
              key={factor}
              variant="secondary"
              size="sm"
              onClick={() => onResizeMeal(meal.key, factor)}
              disabled={disabled}
              className="h-6 px-1.5 py-0 text-3xs font-medium bg-surface-1 border border-white/5 text-text-secondary hover:text-text-primary hover:border-primary/40 min-w-0"
            >
              {factor}x
            </Button>
          ))}
        </div>
      </div>

      <p className="text-xs text-text-muted italic">{meal.instructions}</p>

      <div className="divide-y divide-white/5 pt-1">
        {meal.ingredients.map((ing) => (
          <div key={ing.product.id} className="flex items-center justify-between py-1 text-xs">
            <span className="text-text-secondary">{ing.product.name}</span>
            <span className="tabular-nums text-text-muted">
              {ing.grams} g · {ing.macros.calories} kcal · B: {ing.macros.protein} g
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-1 text-2xs text-text-muted border-t border-white/5">
        <span>Makra posiłku: {meal.totals.calories} kcal</span>
        <span>B: {meal.totals.protein} g</span>
        <span>W: {meal.totals.carbs} g</span>
        <span>T: {meal.totals.fat} g</span>
      </div>
      <GlycemicEstimate items={meal.ingredients.map(item=>({id:item.product.id,name:item.product.name,grams:item.grams,carbs:item.macros.carbs,fiber:item.macros.fiber}))}/>
    </article>
  );
}
