import { describe, expect, it } from 'vitest';
import { computeWeekBalance } from './weekBalance';

const WEEK = '2026-10-19';

describe('computeWeekBalance', () => {
  it('sumuje zjedzone od poniedziałku i dolicza średni cel na dni przed nami', () => {
    const result = computeWeekBalance({
      weekStart: WEEK,
      today: '2026-10-21',
      eatenByDate: { '2026-10-19': 2530, '2026-10-20': 2679, '2026-10-21': 1737 },
      targetByDate: { '2026-10-19': 2400, '2026-10-20': 2500, '2026-10-21': 2600 },
      fallbackTarget: null,
    });
    // średni cel 2500 → budżet 3 dni (7500) + 4 dni × 2500 = 17500
    expect(result).toEqual({ eaten: 6946, budget: 17500, remaining: 10554, perDayLeft: 2111, daysLeft: 5, missingDays: 0, partialDays: 0, binding: true });
  });

  it('potwierdzony pusty dzień to post, a dzień oznaczony jako niepełny odbiera budżetowi wiążący charakter', () => {
    const base = {
      weekStart: WEEK,
      today: '2026-10-22',
      eatenByDate: { '2026-10-19': 2500, '2026-10-21': 2400 },
      targetByDate: { '2026-10-19': 2500, '2026-10-20': 2500, '2026-10-21': 2500 },
      fallbackTarget: null,
    };
    const fasted = computeWeekBalance({ ...base, completenessByDate: { '2026-10-20': 'complete' } });
    expect(fasted).toMatchObject({ missingDays: 0, partialDays: 0, binding: true });

    const partial = computeWeekBalance({ ...base, completenessByDate: { '2026-10-20': 'complete', '2026-10-21': 'partial' } });
    expect(partial).toMatchObject({ missingDays: 0, partialDays: 1, binding: false });

    expect(computeWeekBalance(base)).toMatchObject({ missingDays: 1, binding: false });
  });

  it('zgłasza dni bez wpisów zamiast cicho zawyżać pozostałe kcal', () => {
    const result = computeWeekBalance({
      weekStart: WEEK,
      today: '2026-10-21',
      eatenByDate: { '2026-10-19': 2500, '2026-10-21': 500 },
      targetByDate: { '2026-10-19': 2500, '2026-10-20': 2500, '2026-10-21': 2500 },
      fallbackTarget: null,
    });
    expect(result?.missingDays).toBe(1);
  });

  it('dla minionego tygodnia nie podaje dziennej puli', () => {
    const result = computeWeekBalance({
      weekStart: WEEK,
      today: '2026-10-28',
      eatenByDate: {},
      targetByDate: { '2026-10-19': 2000 },
      fallbackTarget: 2000,
    });
    expect(result?.perDayLeft).toBeNull();
    expect(result?.daysLeft).toBe(0);
  });

  it('bez żadnego celu nie zgaduje', () => {
    expect(computeWeekBalance({ weekStart: WEEK, today: '2026-10-21', eatenByDate: {}, targetByDate: {}, fallbackTarget: null })).toBeNull();
  });
});

it('marks the current day as nonbinding immediately when it is explicitly partial', () => {
  expect(computeWeekBalance({ weekStart: '2026-10-26', today: '2026-10-27', eatenByDate: { '2026-10-26': 2400, '2026-10-27': 1200 }, targetByDate: {}, fallbackTarget: 2400, completenessByDate: { '2026-10-26': 'complete', '2026-10-27': 'partial' } })).toMatchObject({ partialDays: 1, binding: false });
});

it('does not count an explicitly partial empty day again as a missing day', () => {
  expect(computeWeekBalance({ weekStart: '2026-10-26', today: '2026-10-27', eatenByDate: {}, targetByDate: {}, fallbackTarget: 2400, completenessByDate: { '2026-10-26': 'partial' } })).toMatchObject({ partialDays: 1, missingDays: 0, binding: false });
});
