import { describe, expect, it } from 'vitest';
import { MIN_FULL_DAY_KCAL, completedNutritionDays, nutritionSeries } from './nutritionDays';

const rows = [
  { date: '2026-10-19', calories: 2530, protein: 153.1, fiber: 7.0 },
  { date: '2026-10-21', calories: 1737, protein: 59.4, fiber: 0 },
  { date: '2026-10-22', calories: 0, protein: 0, fiber: 0 },
  { date: '2026-10-23', calories: 2282, protein: null, fiber: null },
  { date: '2026-10-24', calories: 1531, protein: 17.2, fiber: 3.1 },
];

describe('completedNutritionDays', () => {
  it('pomija dzień poniżej progu pełnego dnia jako niepełny zapis', () => {
    const withPartial = [...rows, { date: '2026-10-12', calories: 864, protein: 45.4, fiber: 3.1 }];
    expect(completedNutritionDays(withPartial, '2026-10-25').map((r) => r.date)).not.toContain('2026-10-12');
    expect(MIN_FULL_DAY_KCAL).toBe(1000);
  });

  it('pomija dzisiejszy dzień w toku i dni bez zapisanych kalorii', () => {
    expect(completedNutritionDays(rows, '2026-10-24').map((r) => r.date)).toEqual(['2026-10-19', '2026-10-21', '2026-10-23']);
  });

  it('dzień po zakończeniu liczy się normalnie', () => {
    expect(completedNutritionDays(rows, '2026-10-25').map((r) => r.date)).toContain('2026-10-24');
  });

  it('brak wierszy to pusta lista', () => {
    expect(completedNutritionDays(null, '2026-10-24')).toEqual([]);
  });
});

describe('nutritionSeries', () => {
  it('zachowuje zero jako wartość (dzień bez błonnika) i pomija brak danych', () => {
    expect(nutritionSeries(rows, '2026-10-24', (r) => r.fiber)).toEqual([
      { date: '2026-10-19', value: 7 },
      { date: '2026-10-21', value: 0 },
    ]);
  });

  it('nie wlicza dzisiejszego dnia do białka', () => {
    expect(nutritionSeries(rows, '2026-10-24', (r) => r.protein).map((p) => p.value)).toEqual([153.1, 59.4]);
  });
});
