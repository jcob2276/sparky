import { expect, it } from 'vitest';
import { buildRecordedPortfolio } from './recordedPortfolio';
const event = (date: string, quantity_after: number, kind = 'opening', amount_pln: number | null = null) => ({ id: date, holding_id: 'h', ticker: 'ABC', recorded_at: `${date}T12:00:00Z`, quantity_after, kind, amount_pln });
const prices = [{ ticker: 'ABC', date: '2026-11-12', pricePln: 100 }, { ticker: 'ABC', date: '2026-11-13', pricePln: 110 }];
it('uses historical quantities and separates a purchase from valuation change', () => {
  const result = buildRecordedPortfolio([event('2026-11-12',10), event('2026-11-13',12,'purchase',210)], prices, '2026-11-13');
  expect(result.points.map(p => p.value)).toEqual([1000,1320]);
  expect(result.purchases).toBe(210);
  expect(result.valuationChange).toBe(110);
});
it('does not label corrections as investment gains', () => {
  expect(buildRecordedPortfolio([event('2026-11-12',10),event('2026-11-13',12,'adjustment')],prices,'2026-11-13').valuationChange).toBeNull();
});
it('never substitutes zero for an unpriced active holding', () => {
  const result=buildRecordedPortfolio([event('2026-11-12',10)],[],'2026-11-13');
  expect(result.points).toEqual([]);
  expect(result.missing).toEqual(['ABC']);
});

it('ignores missing quotes before the selected comparison interval', () => {
  const result=buildRecordedPortfolio([event('2026-10-01',10)],prices,'2026-11-13','2026-11-12');
  expect(result.missing).toEqual([]);
  expect(result.valuationChange).toBe(100);
});
