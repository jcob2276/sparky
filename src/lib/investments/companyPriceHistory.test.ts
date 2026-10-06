import { expect, it } from 'vitest';
import { summarizeCompanyPrices } from './companyPriceHistory';

it('keeps a partial history from becoming a yearly return or a stale daily change', () => {
  const result = summarizeCompanyPrices([
    { date: '2026-10-02', close_raw: 100, close_adj: 90, currency: 'PLN', source_url: 'https://finance.yahoo.com/quote/XTB.WA/' },
    { date: '2026-10-05', close_raw: 110, currency: 'PLN', source_url: 'https://finance.yahoo.com/quote/XTB.WA/' },
  ], '2026-10-06');
  expect(result).toMatchObject({ price: 110, changeTodayPct: null, change1yPct: null, priceCurrency: 'PLN', priceDate: '2026-10-05' });
  expect(result.prices.map(row => row.close)).toEqual([100, 110]);
});

it('uses a sourced anniversary baseline and excludes future and invalid rows', () => {
  const source = { currency: 'USD', source_url: 'https://finance.yahoo.com/quote/NVDA/' };
  const result = summarizeCompanyPrices([
    { ...source, date: '2026-10-06', close_raw: 120 },
    { ...source, date: '2026-10-05', close_raw: 100 },
    { ...source, date: '2025-10-06', close_raw: 80 },
    { ...source, date: '2027-01-01', close_raw: 1000 },
    { ...source, date: '2026-10-01', close_raw: Number.NaN },
    { date: '2026-10-02', close_adj: 500 },
  ], '2026-10-06');
  expect(result).toMatchObject({ price: 120, change1yPct: 50 });
  expect(result.changeTodayPct).toBeCloseTo(20);
  expect(result.prices).toHaveLength(3);
});

it('does not combine currency series or replace a missing price with zero', () => {
  expect(summarizeCompanyPrices([], '2026-10-06').price).toBeNull();
  const result = summarizeCompanyPrices([
    { date: '2026-10-05', close_raw: 100, currency: 'USD', source_url: 'source' },
    { date: '2026-10-06', close_raw: 400, currency: 'PLN', source_url: 'source' },
  ], '2026-10-06');
  expect(result.changeTodayPct).toBeNull();
  expect(result.prices).toHaveLength(1);
});

it('does not mistake an annual gap between observations for a daily move', () => {
  const source = { currency: 'USD', source_url: 'source' };
  const result = summarizeCompanyPrices([
    { ...source, date: '2025-10-06', close_raw: 100 },
    { ...source, date: '2026-10-06', close_raw: 120 },
  ], '2026-10-06');
  expect(result.changeTodayPct).toBeNull();
  expect(result.change1yPct).toBeCloseTo(20);
});
