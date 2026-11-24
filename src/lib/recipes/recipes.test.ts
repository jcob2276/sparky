import { describe, expect, it } from 'vitest';
import recipesJson from '../../data/recipes.json';
import { filterRecipes } from './filterRecipes';
import { estimatePortionGrams, recipeMealType, recipeToMealItem } from './recipeToMealItem';
import type { Recipe } from './recipeTypes';

const recipes = recipesJson as Recipe[];
const none = new Set<never>();

describe('recipe book data', () => {
  it('has unique ids and plausible macros', () => {
    expect(new Set(recipes.map((recipe) => recipe.id)).size).toBe(recipes.length);
    for (const recipe of recipes) {
      const fromMacros = 4 * recipe.protein + 4 * recipe.carbs + 9 * recipe.fat;
      expect(Math.abs(recipe.calories - fromMacros), recipe.id).toBeLessThanOrEqual(80);
      expect(recipe.ingredients.length, recipe.id).toBeGreaterThan(0);
      expect(recipe.instructions.length, recipe.id).toBeGreaterThan(0);
    }
  });
});

describe('filterRecipes', () => {
  it('applies quick filters together', () => {
    const result = filterRecipes(recipes, { query: '', category: null, quick: new Set(['airfryer', 'protein50']) });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((recipe) => recipe.is_airfryer_compatible && recipe.protein >= 50)).toBe(true);
  });

  it('searches without regard to Polish diacritics', () => {
    const result = filterRecipes(recipes, { query: 'poledwiczki', category: null, quick: none });
    expect(result.some((recipe) => /polędwiczk/i.test(recipe.title + recipe.ingredients.join(' ')))).toBe(true);
  });

  it('filters by category', () => {
    const result = filterRecipes(recipes, { query: '', category: 'Śniadania', quick: none });
    expect(result.every((recipe) => recipe.category === 'Śniadania')).toBe(true);
  });
});

describe('recipeToMealItem', () => {
  it('sums gram quantities and falls back when there are none', () => {
    expect(estimatePortionGrams({ ingredients: ['200g kurczaka', '80 g serka', 'sól'] })).toBe(280);
    expect(estimatePortionGrams({ ingredients: ['sól', 'pieprz'] })).toBe(300);
  });

  it('marks the macros as an estimate for one portion', () => {
    const item = recipeToMealItem(recipes[0]);
    expect(item.calories).toBe(recipes[0].calories);
    expect(item.parseMeta?.macroSource).toBe('llm_estimate');
    expect(item.grams).toBeGreaterThan(0);
  });

  it('maps categories to meal types', () => {
    expect(recipeMealType({ category: 'Śniadania' })).toBe('breakfast');
    expect(recipeMealType({ category: 'Fit Desery' })).toBe('snack');
  });
});
