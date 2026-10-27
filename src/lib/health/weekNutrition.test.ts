import { describe, expect, it } from 'vitest';
import { buildWeekNutrition } from './weekNutrition';

const row = (date: string, calories: number) => ({
  date, calories, protein: 100, carbs: 200, fat: 80, fiber: null, sugar: null, avg_food_quality: null, insulin_load: null,
});

describe('buildWeekNutrition', () => {
  it('liczy budżet pon–nd i pokrycie błonnika tylko z dni, które się liczą', () => {
    const result = buildWeekNutrition({
      data: {
        completenessByDate: {},
        rows: [row('2026-10-19', 2500), row('2026-10-20', 2600), row('2026-10-21', 1000)],
        entries: [
          { date: '2026-10-19', fiber: 3, saturated_fat: null, salt: 2.5 },
          { date: '2026-10-20', fiber: null, saturated_fat: null, salt: null },
          { date: '2026-10-21', fiber: 9, saturated_fat: 4, salt: 1 },
        ],
        targetByDate: { '2026-10-19': 2400, '2026-10-20': 2400, '2026-10-21': 2400 },
      },
      weekStart: '2026-10-19',
      today: '2026-10-21',
      proteinGoal: 150,
      fallbackTarget: 2400,
    });
    expect(result.balance).toMatchObject({ eaten: 6100, budget: 16800, remaining: 10700 });
    expect(result.fiber).toEqual({ total: 3, known: 1, items: 2 });
    expect(result.saturatedFat.known).toBe(0);
    expect(result.salt).toEqual({ total: 2.5, known: 1, items: 2 });
    expect(result.pulse.loggedDays).toBe(2);
  });
});
