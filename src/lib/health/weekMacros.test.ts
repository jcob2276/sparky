import { describe, expect, it } from 'vitest';
import { computeWeekMacros } from './weekMacros';

describe('computeWeekMacros', () => {
  const base = { weekStart: '2026-11-23', today: '2026-11-23', fallback: {} };

  it('siedem dni to siedem dziennych celów, a tłuszcz ponad dzienną porcję jest oznaczony', () => {
    const result = computeWeekMacros({
      ...base,
      eatenByDate: { '2026-11-23': { protein: 75, fat: 69, carbs: 183 } },
      targetByDate: { '2026-11-23': { protein: 170, fat: 50, carbs: 280 } },
    });
    expect(result.fat).toEqual({ eaten: 69, budget: 350, overPace: true });
    expect(result.protein).toEqual({ eaten: 75, budget: 1190, overPace: false });
    expect(result.carbs?.budget).toBe(1960);
  });

  it('używa celu zapasowego, gdy tydzień nie ma zapisanych celów, i pomija makro bez celu', () => {
    const result = computeWeekMacros({ ...base, eatenByDate: {}, targetByDate: {}, fallback: { fat: 50 } });
    expect(result.fat?.budget).toBe(350);
    expect(result.protein).toBeUndefined();
  });
});
