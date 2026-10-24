import { describe, expect, it } from 'vitest';
import { buildBenchGoal } from './benchGoal';

const pts = (rows: Array<[string, number]>) => rows.map(([date, e1rm]) => ({ date, e1rm }));

describe('buildBenchGoal', () => {
  it('brak sesji to no-data, mało sesji nie daje prognozy', () => {
    expect(buildBenchGoal([], '2026-10-24').status).toBe('no-data');
    const few = buildBenchGoal(pts([['2026-09-01', 80], ['2026-10-01', 85]]), '2026-10-24');
    expect(few.status).toBe('few-sessions');
    expect(few.etaDate).toBeNull();
    expect(few.remainingKg).toBe(15);
  });

  it('wzrost 1 kg na tydzień z 4 sesji daje datę osiągnięcia celu', () => {
    const goal = buildBenchGoal(pts([['2026-09-01', 80], ['2026-09-15', 82], ['2026-09-29', 84], ['2026-10-13', 86]]), '2026-10-24');
    expect(goal.status).toBe('on-track');
    expect(goal.weeklyGainKg).toBe(1);
    expect(goal.etaDate).toBe('2027-01-30');
    expect(goal.pct).toBe(86);
  });

  it('stały poziom nie daje prognozy, osiągnięty cel to reached', () => {
    expect(buildBenchGoal(pts([['2026-09-01', 85], ['2026-09-15', 85], ['2026-09-29', 85], ['2026-10-13', 85]]), '2026-10-24').status).toBe('flat');
    expect(buildBenchGoal(pts([['2026-10-01', 101]]), '2026-10-24').status).toBe('reached');
  });
});
