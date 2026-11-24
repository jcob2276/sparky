import { Clock, Flame } from 'lucide-react';
import { Pressable } from '../../../ui/ControlPrimitives';
import type { Recipe } from '../../../../lib/recipes/recipeTypes';

interface RecipeCardProps {
  recipe: Recipe;
  onOpen: (recipe: Recipe) => void;
}

export default function RecipeCard({ recipe, onOpen }: RecipeCardProps) {
  const minutes = recipe.prep_time + recipe.cook_time;
  return (
    <Pressable
      variant="ghost"
      onClick={() => onOpen(recipe)}
      aria-label={recipe.title}
      className="flex w-full flex-col items-stretch gap-2 rounded-2xl border border-[var(--border)] bg-surface-solid p-3.5 text-left active:scale-[0.99]"
    >
      <span className="text-2xs font-semibold text-primary">{recipe.subcategory}</span>
      <span className="text-sm font-bold leading-snug text-text-primary">{recipe.title}</span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
        <span className="font-semibold text-text-primary">{recipe.protein} g białka</span>
        <span>{recipe.calories} kcal</span>
        <span className="flex items-center gap-1"><Clock size={12} aria-hidden="true" />{minutes} min</span>
        {recipe.is_airfryer_compatible && (
          <span className="flex items-center gap-1 text-warning"><Flame size={12} aria-hidden="true" />Air fryer</span>
        )}
      </span>
    </Pressable>
  );
}
