import { describe, expect, it } from 'vitest';
import {
  computeNetWorthGoal,
  computePortfolioTotals,
  computeRebalancePlan,
  layoutTreemap,
  valueHoldings,
  type HoldingInput,
} from '@vanguard/domain';

const holding = (id: string, overrides: Partial<HoldingInput> = {}): HoldingInput => ({
  id,
  ticker: id.toUpperCase(),
  name: id,
  assetClass: 'etf',
  quantity: 10,
  avgCostPln: 100,
  targetWeightPct: null,
  ...overrides,
});

describe('valueHoldings', () => {
  it('values by quote, falls back to cost without quote, and computes weights', () => {
    const rows = valueHoldings(
      [holding('a'), holding('b', { quantity: 5, avgCostPln: 200 })],
      { A: { pricePln: 150, changePct: 2, asOf: null } },
    );

    expect(rows[0]).toMatchObject({ valuePln: 1500, costPln: 1000, pnlPln: 500, pnlPct: 50, hasQuote: true });
    expect(rows[1]).toMatchObject({ valuePln: 1000, hasQuote: false, dayChangePln: 0 });
    expect(rows[0].weightPct + rows[1].weightPct).toBeCloseTo(100, 1);
    expect(rows[0].dayChangePln).toBeCloseTo(29.41, 2);
  });

  it('summarizes totals and counts unquoted positions', () => {
    const rows = valueHoldings([holding('a'), holding('b')], { A: { pricePln: 110, changePct: 1, asOf: null } });
    const totals = computePortfolioTotals(rows);

    expect(totals.valuePln).toBe(2100);
    expect(totals.pnlPln).toBe(100);
    expect(totals.unquotedCount).toBe(1);
  });
});

describe('computeRebalancePlan', () => {
  const rows = valueHoldings(
    [
      holding('a', { targetWeightPct: 50 }),
      holding('b', { targetWeightPct: 50 }),
    ],
    { A: { pricePln: 150, changePct: null, asOf: null }, B: { pricePln: 50, changePct: null, asOf: null } },
  );

  it('buys only the underweight position when the amount is small, without selling', () => {
    const plan = computeRebalancePlan(rows, 500);

    expect(plan.buys).toHaveLength(1);
    expect(plan.buys[0].ticker).toBe('B');
    expect(plan.buys[0].buyPln).toBe(500);
    expect(plan.leftoverPln).toBe(0);
  });

  it('splits a large amount to reach target weights', () => {
    const plan = computeRebalancePlan(rows, 2500);
    const total = 1500 + 500 + 2500;

    expect(plan.allocatedPln).toBeCloseTo(2500, 1);
    for (const buy of plan.buys) expect(buy.weightAfterPct).toBeCloseTo(50, 0);
    expect(total).toBe(4500);
  });

  it('returns nothing without targets or amount', () => {
    expect(computeRebalancePlan(valueHoldings([holding('a')], {}), 1000).buys).toEqual([]);
    expect(computeRebalancePlan(rows, 0).buys).toEqual([]);
  });

  it('drops buys below the minimum order and reports leftover', () => {
    const plan = computeRebalancePlan(rows, 1200, 700);

    expect(plan.buys.every((buy) => buy.buyPln >= 700)).toBe(true);
    expect(plan.leftoverPln).toBeGreaterThan(0);
  });
});

describe('layoutTreemap', () => {
  it('fills the whole area with rectangles proportional to value', () => {
    const rects = layoutTreemap([
      { id: 'a', value: 60 },
      { id: 'b', value: 30 },
      { id: 'c', value: 10 },
    ]);
    const area = (id: string) => {
      const rect = rects.find((item) => item.id === id)!;
      return rect.w * rect.h;
    };

    expect(rects).toHaveLength(3);
    expect(rects.reduce((sum, rect) => sum + rect.w * rect.h, 0)).toBeCloseTo(10000, 3);
    expect(area('a') / area('b')).toBeCloseTo(2, 3);
  });

  it('ignores non-positive values and empty input', () => {
    expect(layoutTreemap([])).toEqual([]);
    expect(layoutTreemap([{ id: 'x', value: 0 }])).toEqual([]);
  });
});

describe('computeNetWorthGoal', () => {
  it('reports progress and months with savings and return', () => {
    const result = computeNetWorthGoal({ netWorth: 30000, target: 100000, monthlySaving: 2000, annualReturnPct: 6 });

    expect(result.progressPct).toBe(30);
    expect(result.remaining).toBe(70000);
    expect(result.monthsToGoal).toBeGreaterThan(24);
    expect(result.monthsToGoal).toBeLessThan(36);
  });

  it('returns null months when the goal is unreachable and zero when reached', () => {
    expect(computeNetWorthGoal({ netWorth: 1000, target: 100000, monthlySaving: 0, annualReturnPct: 0 }).monthsToGoal).toBeNull();
    expect(computeNetWorthGoal({ netWorth: 120000, target: 100000, monthlySaving: 0, annualReturnPct: 0 })).toMatchObject({ reached: true, monthsToGoal: 0 });
  });
});
