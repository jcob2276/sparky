import { describe, expect, it } from 'vitest';
import { buildBodyFatGoal, type DatedPoint } from './bodyFatGoal';

const pts = (rows: Array<[string, number]>): DatedPoint[] => rows.map(([date, value]) => ({ date, value }));
const today = '2026-10-24';

describe('buildBodyFatGoal', () => {
  it('brak pomiaru BF to no-data, osiągnięty cel to reached', () => {
    expect(buildBodyFatGoal({ bf: [], weight: [], waist: [], goal: 15, today }).status).toBe('no-data');
    expect(buildBodyFatGoal({ bf: pts([['2026-10-21', 14.5]]), weight: [], waist: [], goal: 15, today }).status).toBe('reached');
  });

  it('liczy kilogramy do celu przy stałej masie mięśniowej i datę przy tempie 0,5 kg/tydz.', () => {
    const goal = buildBodyFatGoal({ bf: pts([['2026-10-21', 21.2]]), weight: pts([['2026-10-21', 77.5]]), waist: [], goal: 15, today });
    expect(goal.status).toBe('few-measurements');
    expect(goal.remainingPp).toBe(6.2);
    expect(goal.kgToLose).toBe(5.7);
    expect(goal.scenarioEta).toBe('2027-01-16');
  });

  it('prognoza trendu dopiero od 3 pomiarów z rozpiętością 4 tygodni', () => {
    const few = buildBodyFatGoal({ bf: pts([['2026-08-25', 20.4], ['2026-10-21', 21.2]]), weight: pts([['2026-10-21', 77.5]]), waist: [], goal: 15, today });
    expect(few.status).toBe('few-measurements');
    expect(few.trendEta).toBeNull();
  });

  it('rosnący BF to rising bez daty, spadający daje datę z trendu', () => {
    const weight = pts([['2026-08-01', 80]]);
    const rising = buildBodyFatGoal({ bf: pts([['2026-08-01', 20], ['2026-09-01', 20.8], ['2026-10-01', 21.6]]), weight, waist: [], goal: 15, today });
    expect(rising.status).toBe('rising');
    expect(rising.trendEta).toBeNull();
    const falling = buildBodyFatGoal({ bf: pts([['2026-08-01', 22], ['2026-09-01', 21], ['2026-10-01', 20]]), weight, waist: [], goal: 15, today });
    expect(falling.status).toBe('falling');
    expect(falling.slopePpPerWeek).toBeCloseTo(-0.2, 1);
    expect(falling.trendEta).toMatch(/^2027-/);
  });

  it('fakty o wadze i talii tylko przy rozpiętości 14 dni', () => {
    const goal = buildBodyFatGoal({
      bf: pts([['2026-10-21', 21.2]]), weight: pts([['2026-09-05', 76], ['2026-10-21', 77.5]]), waist: pts([['2026-10-15', 86], ['2026-10-21', 87]]), goal: 15, today,
    });
    expect(goal.facts).toEqual(['Waga +1,5 kg od 09-05.']);
  });
});
