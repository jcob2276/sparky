import type { Recipe } from './recipeTypes';

let cache: Promise<Recipe[]> | null = null;

/** Książka przepisów jest duża (ok. 250 kB), więc ładuje się dopiero po wejściu na ekran. */
export function loadRecipes(): Promise<Recipe[]> {
  cache ??= import('../../data/recipes.json').then((module) => {
    const all = module.default as Recipe[];
    // Przepisy ze zdjęciami na górze; kolejność w obrębie grup bez zmian.
    return [...all.filter((recipe) => recipe.image), ...all.filter((recipe) => !recipe.image)];
  });
  return cache;
}
