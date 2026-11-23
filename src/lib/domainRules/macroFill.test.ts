import { describe, expect, it } from 'vitest';
import { suggestMacroFill, type FillCandidate } from '@vanguard/domain';

const skyr: FillCandidate = { id: 'skyr', name: 'Skyr naturalny', per100: { kcal: 63, protein: 11, carbs: 4, fat: 0.2 }, portionGrams: 150 };
const whey: FillCandidate = { id: 'whey', name: 'Odżywka białkowa', per100: { kcal: 380, protein: 80, carbs: 7, fat: 5 }, portionGrams: 30 };
const peanut: FillCandidate = { id: 'pb', name: 'Masło orzechowe', per100: { kcal: 600, protein: 25, carbs: 12, fat: 50 }, portionGrams: 30 };
const rice: FillCandidate = { id: 'rice', name: 'Ryż gotowany', per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 }, portionGrams: 150 };

describe('suggestMacroFill', () => {
  it('przy przekroczonym tłuszczu wybiera chude źródła białka, nie masło orzechowe', () => {
    const result = suggestMacroFill({ kcal: 628, protein: 95, fat: -19, carbs: 97 }, [skyr, whey, peanut, rice]);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].items.some((i) => i.id === 'pb')).toBe(false);
    expect(result[0].protein).toBeGreaterThan(30);
    expect(result[0].kcal).toBeLessThanOrEqual(628 * 1.05 + 20);
  });

  it('nie powtarza produktu w dwóch propozycjach', () => {
    const result = suggestMacroFill({ kcal: 700, protein: 90, fat: 20, carbs: 100 }, [skyr, whey, rice, peanut]);
    const ids = result.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('zwraca pustą listę, gdy nie zostało kalorii', () => {
    expect(suggestMacroFill({ kcal: 40, protein: 30, fat: 5, carbs: 10 }, [skyr, whey])).toEqual([]);
  });
});
