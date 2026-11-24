import { Clock, Flame } from 'lucide-react';
import { Pressable } from '../../../ui/ControlPrimitives';
import type { Recipe } from '../../../../lib/recipes/recipeTypes';
import FavoriteButton from './FavoriteButton';
import RecipePhoto from './RecipePhoto';

interface RecipeCardProps {
  recipe: Recipe;
  favorite: boolean;
  onOpen: (recipe: Recipe) => void;
  onToggleFavorite: (recipe: Recipe) => void;
}

export default function RecipeCard({ recipe, favorite, onOpen, onToggleFavorite }: RecipeCardProps) {
  const minutes = recipe.prep_time + recipe.cook_time;
  return (
    <div className="relative">
      <Pressable
        variant="ghost"
        onClick={() => onOpen(recipe)}
        aria-label={recipe.title}
        className="flex w-full flex-col items-stretch overflow-hidden rounded-2xl border border-[var(--border)] bg-surface-solid text-left active:scale-[0.99]"
      >
        {recipe.image && <RecipePhoto src={recipe.image} className="h-36 w-full" />}
        <span className="flex flex-col gap-2 p-3.5">
          <span className="pr-12 text-2xs font-semibold text-primary">{recipe.subcategory}</span>
          <span className="text-sm font-bold leading-snug text-text-primary">{recipe.title}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span className="font-semibold text-text-primary">{recipe.protein} g białka</span>
            <span>{recipe.calories} kcal</span>
            <span className="flex items-center gap-1"><Clock size={12} aria-hidden="true" />{minutes} min</span>
            {recipe.is_airfryer_compatible && (
              <span className="flex items-center gap-1 text-warning"><Flame size={12} aria-hidden="true" />Air fryer</span>
            )}
          </span>
        </span>
      </Pressable>
      <FavoriteButton active={favorite} title={recipe.title} onToggle={() => onToggleFavorite(recipe)} className="absolute right-2 top-2" />
    </div>
  );
}
