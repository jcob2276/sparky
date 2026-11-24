import type { MealDraftItem } from '../health/nutritionTracker';
import type { Recipe } from './recipeTypes';

const FALLBACK_PORTION_G = 300;

/** Masa porcji z gramatur w składnikach („200g…”, „80 g…”); brak gramatur = wartość zastępcza. */
export function estimatePortionGrams(recipe: Pick<Recipe, 'ingredients'>): number {
  let total = 0;
  for (const line of recipe.ingredients) {
    const match = line.match(/(\d+(?:[.,]\d+)?)\s?(?:g|ml)\b/i);
    if (match) total += Number(match[1].replace(',', '.'));
  }
  return total >= 50 ? Math.round(total) : FALLBACK_PORTION_G;
}

/** Jedna porcja przepisu jako pozycja szkicu posiłku. Makra to szacunek, więc zaufanie „estimated”. */
export function recipeToMealItem(recipe: Recipe): MealDraftItem {
  return {
    id: crypto.randomUUID(),
    name: recipe.title,
    grams: estimatePortionGrams(recipe),
    calories: recipe.calories,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
    confidence: 'medium',
    source: 'library',
    assumptions: ['Makra z książki przepisów (szacunek na porcję)'],
    parseMeta: { macroSource: 'llm_estimate', parserVersion: 'recipe-book-v1', quantity: 1, unit: 'portion' },
  };
}

export function recipeMealType(recipe: Pick<Recipe, 'category'>): string {
  if (recipe.category === 'Śniadania') return 'breakfast';
  if (recipe.category === 'Kolacje') return 'dinner';
  if (recipe.category === 'Obiady' || recipe.category === 'Lunche & Do pracy') return 'lunch';
  return 'snack';
}
