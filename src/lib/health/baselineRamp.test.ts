import { describe, expect, it } from 'vitest';
import { heaviestSetKg, parseSets, rampSets, summarizeSets } from './baselineRamp';

describe('baselineRamp', () => {
  it('układa serie od rozgrzewki do 100% starego maksa z zaokrągleniem do 2,5 kg', () => {
    const sets = rampSets(40)!;
    expect(sets.map((s) => s.kg)).toEqual([0, 10, 20, 20, 30, 30, 35, 40]);
    expect(sets.map((s) => s.reps)).toEqual([8, 5, 3, 3, 2, 2, 1, 1]);
  });

  it('odrzuca brak lub nonsensowny max', () => {
    expect(rampSets(0)).toBeNull();
    expect(rampSets(Number.NaN)).toBeNull();
    expect(rampSets(900)).toBeNull();
  });

  it('streszcza serie i znajduje najcięższą z powtórzeniem', () => {
    const sets = [{ kg: 0, reps: 8 }, { kg: 22.5, reps: 2 }, { kg: 40, reps: null }, { kg: null, reps: null }];
    expect(summarizeSets(sets)).toBe('0×8, 22,5×2');
    expect(heaviestSetKg(sets)).toBe(22.5);
    expect(heaviestSetKg([{ kg: 0, reps: 5 }])).toBeNull();
  });

  it('parsuje serie z bazy i odrzuca śmieci', () => {
    expect(parseSets([{ kg: 20, reps: 3 }, { kg: 'x', reps: 2 }, null])).toEqual([{ kg: 20, reps: 3 }, { kg: null, reps: 2 }]);
    expect(parseSets('nie lista')).toBeNull();
    expect(parseSets(null)).toBeNull();
  });
});
