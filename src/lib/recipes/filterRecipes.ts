import type { Recipe, RecipeFilters, RecipeQuickFilter } from './recipeTypes';

const QUICK_RULES: Record<RecipeQuickFilter, (recipe: Recipe) => boolean> = {
  airfryer: (recipe) => recipe.is_airfryer_compatible,
  protein40: (recipe) => recipe.protein >= 40,
  protein50: (recipe) => recipe.protein >= 50,
  fast: (recipe) => recipe.prep_time + recipe.cook_time <= 15,
  lowCarb: (recipe) => recipe.carbs <= 15,
};

const normalize = (text: string) => text.toLocaleLowerCase('pl').normalize('NFD').replace(/\p{Diacritic}/gu, '');

export function filterRecipes(recipes: readonly Recipe[], filters: RecipeFilters): Recipe[] {
  const query = normalize(filters.query.trim());
  return recipes.filter((recipe) => {
    if (filters.category && recipe.category !== filters.category) return false;
    for (const key of filters.quick) if (!QUICK_RULES[key](recipe)) return false;
    if (!query) return true;
    const haystack = normalize([recipe.title, recipe.subcategory, ...recipe.tags, ...recipe.ingredients].join(' '));
    return haystack.includes(query);
  });
}
