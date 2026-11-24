import { describe, expect, it } from 'vitest';
import recipesJson from '../../data/recipes.json';
import { buildShoppingList, shoppingListToText } from './shoppingList';
import type { Recipe } from './recipeTypes';

const recipes = recipesJson as Recipe[];
const make = (title: string, basket: string[]): Recipe => ({ ...recipes[0], title, lidl_biedronka_basket: basket });

describe('buildShoppingList', () => {
  it('merges variants of the same product and counts recipes', () => {
    const list = buildShoppingList([
      make('A', ['200g piersi z kurczaka w kostce', 'Jajka']),
      make('B', ['Pierś z kurczaka', '2 jajka (L)']),
    ]);
    const chicken = list.find((item) => item.name === 'Pierś z kurczaka');
    expect(chicken?.count).toBe(2);
    expect(list.find((item) => item.name === 'Jajka')?.count).toBe(2);
    expect(list).toHaveLength(2);
  });

  it('does not count a product twice for one recipe', () => {
    const list = buildShoppingList([make('A', ['Jajka', '3 jajka'])]);
    expect(list).toEqual([expect.objectContaining({ name: 'Jajka', count: 1 })]);
  });

  it('orders by store section', () => {
    const list = buildShoppingList([make('A', ['Oliwa w sprayu', 'Łosoś', 'Skyr naturalny'])]);
    expect(list.map((item) => item.group)).toEqual(['Mięso i ryby', 'Nabiał i jajka', 'Spiżarnia i przyprawy']);
  });

  it('shrinks the real recipe book list well below the raw distinct strings', () => {
    const raw = new Set(recipes.flatMap((recipe) => recipe.lidl_biedronka_basket));
    expect(buildShoppingList(recipes).length).toBeLessThan(raw.size);
  });
});

describe('shoppingListToText', () => {
  it('skips checked items and shows multipliers', () => {
    const list = buildShoppingList([make('A', ['Jajka', 'Skyr']), make('B', ['Jajka'])]);
    const text = shoppingListToText(list, new Set(['skyr']));
    expect(text).toContain('- Jajka (×2)');
    expect(text).not.toContain('Skyr');
  });
});
