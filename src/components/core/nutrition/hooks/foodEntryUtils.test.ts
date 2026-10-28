import { describe, expect, it } from 'vitest';
import { parseGrams, derivePer100, type RecentEntry } from './foodEntryUtils';
const entry: RecentEntry = { id: 'x', name: 'Jajka', brand: null, calories: 210, protein: 18, carbs: 1, fat: 15, amount: '3 szt.', date: '2026-10-27' };
describe('historical entry weight', () => {
  it.each(['3 szt.', '1 porcja', null])('does not invent grams or per-100g data for %s', (amount) => {
    expect(parseGrams(amount)).toBeNull();
    expect(derivePer100({ ...entry, amount })).toBeNull();
  });
  it('uses explicit kg and decimal grams with the shared parser', () => {
    expect(parseGrams('1,5 kg')).toBe(1500);
    expect(parseGrams('12,5 g')).toBe(12.5);
    expect(derivePer100({ ...entry, amount: '150 g' })).toEqual({ calories: 140, protein: 12, carbs: 2 / 3, fat: 10 });
  });
});
