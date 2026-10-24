import { describe, expect, it } from 'vitest';
import { buildGoalScenarios } from './goalScenarios';

const base = { netWorth: 0, target: 100000, monthlySaving: 6700, expectedReturnPct: 11, inflationPct: 3 };

describe('buildGoalScenarios', () => {
  it('zwraca czasy dla trzech założeń zysku, od najwolniejszego do najszybszego', () => {
    const scenarios = buildGoalScenarios(base)!;
    const [none, inflation, expected] = scenarios.returns.map((r) => r.months!);
    expect(none).toBe(15); // 100000 / 6700 = 14,9
    expect(inflation).toBeLessThanOrEqual(none);
    expect(expected).toBeLessThanOrEqual(inflation);
    expect(expected).toBeGreaterThan(10);
  });

  it('dodatkowe 500 zł miesięcznie skraca czas, a ujemna różnica oznacza szybciej', () => {
    const effect = buildGoalScenarios(base)!.extraSavingEffect!;
    expect(effect.delta).toBe(500);
    expect(effect.monthsDifference).toBeLessThan(0);
  });

  it('podaje wkład na 12 miesięcy tylko gdy przy obecnym tempie cel zajmie dłużej', () => {
    const slow = buildGoalScenarios({ ...base, monthlySaving: 3000 })!;
    expect(slow.savingFor12Months).toBeGreaterThan(3000);
    const fast = buildGoalScenarios({ ...base, monthlySaving: 9000 })!;
    expect(fast.savingFor12Months).toBeNull();
  });

  it('osiągnięty cel albo brak celu nie daje scenariuszy', () => {
    expect(buildGoalScenarios({ ...base, netWorth: 100000 })).toBeNull();
    expect(buildGoalScenarios({ ...base, target: 0 })).toBeNull();
  });

  it('brak oszczędzania daje brak daty zamiast zera', () => {
    const none = buildGoalScenarios({ ...base, monthlySaving: 0 })!;
    expect(none.returns[0].months).toBeNull();
  });
});
