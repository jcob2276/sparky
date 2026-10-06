import { expect, it } from 'vitest';
import { computeEqualWeightSeries } from './dashboardIndex';
it('does not build an index from only part of the watchlist', () => {
  expect(computeEqualWeightSeries(['AAPL', 'MSFT'], [{ ticker: 'AAPL', date: '2026-10-01', close_raw: 100 }, { ticker: 'AAPL', date: '2026-10-02', close_raw: 120 }])).toBeNull();
});
it('uses shared dates and a fixed denominator for all constituents', () => {
  const result = computeEqualWeightSeries(['AAPL', 'MSFT'], [
    { ticker: 'AAPL', date: '2026-10-01', close_raw: 100 },
    { ticker: 'AAPL', date: '2026-10-02', close_raw: 110 }, { ticker: 'MSFT', date: '2026-10-02', close_raw: 200 },
    { ticker: 'AAPL', date: '2026-10-03', close_raw: 121 }, { ticker: 'MSFT', date: '2026-10-03', close_raw: 180 },
  ]);
  expect(result?.dates).toEqual(['2026-10-02', '2026-10-03']);
  expect(result?.values).toEqual([100, 100]);
});
