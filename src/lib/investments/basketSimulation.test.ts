import { expect, it } from 'vitest';
import { calculateDisclosureBasket, type BasketPrice } from './basketSimulation';

const price = (ticker: string, date: string, close_adj: number): BasketPrice =>
  ({ ticker, date, close_adj, currency: 'USD', source_url: 'https://query1.finance.yahoo.com/chart' });
it('starts after disclosure, uses equal initial weights and holds quantities without daily rebalancing', () => {
  const data = calculateDisclosureBasket(['A', 'B'], '2026-08-14', [
    price('A','2026-08-14',1), price('B','2026-08-14',1),
    price('A','2026-08-17',100), price('B','2026-08-17',200),
    price('A','2026-08-18',200), price('B','2026-08-18',100),
    price('A','2026-08-19',300), price('B','2026-08-19',200),
  ], '2026-08-19');
  expect(data.points.map(p => [p.date,p.returnPct])).toEqual([
    ['2026-08-17',0], ['2026-08-18',25], ['2026-08-19',100],
  ]);
  expect(data.positions[0]).toMatchObject({ baselinePrice: 100, latestPrice: 300, initialWeightPct: 50 });
});
it('does not replace an unpriced member with another stock or dilute a partial basket to 100%', () => {
  const data = calculateDisclosureBasket(['A','B'], '2026-08-14', [
    price('A','2026-08-17',100),price('A','2026-08-18',110),
  ], '2026-08-19');
  expect(data.points).toEqual([]);
  expect(data.missingTickers).toEqual(['B']);
});
it('uses only common valuation dates and excludes future, unsourced, non-USD and invalid prices', () => {
  const data = calculateDisclosureBasket(['A','B'], '2026-08-14', [
    price('A','2026-08-17',100),price('B','2026-08-17',100),
    price('A','2026-08-18',110),
    price('A','2026-08-19',120),price('B','2026-08-19',110),
    price('A','2026-08-20',999),price('B','2026-08-20',999),
    { ...price('B','2026-08-18',200), currency: 'PLN' },
    { ...price('B','2026-08-18',200), source_url: '' },
  ], '2026-08-19');
  expect(data.points.map(p => p.date)).toEqual(['2026-08-17','2026-08-19']);
  expect(data.points.at(-1)?.returnPct).toBeCloseTo(15);
});
it('refuses to silently start months after the disclosures because baseline prices are missing', () => {
  const data = calculateDisclosureBasket(['A'], '2026-08-14', [
    price('A','2026-09-01',100),price('A','2026-09-02',110),
  ], '2026-09-03');
  expect(data.points).toEqual([]);
  expect(data.reason).toContain('początku');
});
