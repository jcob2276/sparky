import type { Recipe } from './recipeTypes';

let cache: Promise<Recipe[]> | null = null;

/** Książka przepisów jest duża (ok. 250 kB), więc ładuje się dopiero po wejściu na ekran. */
export function loadRecipes(): Promise<Recipe[]> {
  cache ??= import('../../data/recipes.json').then((module) => module.default as Recipe[]);
  return cache;
}
