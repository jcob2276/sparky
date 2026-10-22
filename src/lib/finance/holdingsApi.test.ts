import { describe, expect, it } from 'vitest';
import type { ValuedHolding } from '@vanguard/domain';
import type { FinanceAccount } from '../financeApi';
import { buildAllocationSlices } from './allocationSlices';
import { mapHolding, normalizeTicker, parseQuotes } from './holdingsApi';

describe('holdingsApi mapping', () => {
  it('maps numeric strings and unknown classes safely', () => {
    expect(mapHolding({
      id: '1', ticker: 'VGWD.DE', name: 'VGWD', asset_class: 'weird', quantity: '4.5', avg_cost_pln: '120.1', target_weight_pct: '16',
    })).toEqual({
      id: '1', ticker: 'VGWD.DE', name: 'VGWD', assetClass: 'other', quantity: 4.5, avgCostPln: 120.1, targetWeightPct: 16,
    });
    expect(mapHolding({ id: '2', ticker: 'X', name: 'X', asset_class: 'etf', quantity: 1, avg_cost_pln: 1, target_weight_pct: null }).targetWeightPct).toBeNull();
  });

  it('normalizes tickers to upper case', () => {
    expect(normalizeTicker('  vgwd.de ')).toBe('VGWD.DE');
  });

  it('keeps only quotes with a positive PLN price, keyed in upper case', () => {
    const quotes = parseQuotes({
      quotes: {
        'vgwd.de': { pricePln: 480.5, changePct: 0.61, quoteAsOf: '2026-10-22T10:00:00Z' },
        BAD: { pricePln: null },
        ZERO: { pricePln: 0 },
      },
    });

    expect(Object.keys(quotes)).toEqual(['VGWD.DE']);
    expect(quotes['VGWD.DE']).toEqual({ pricePln: 480.5, changePct: 0.61, asOf: '2026-10-22T10:00:00Z' });
    expect(parseQuotes(null)).toEqual({});
  });
});

describe('buildAllocationSlices', () => {
  const account = (id: string, type: string, balance: number): FinanceAccount => ({
    id, user_id: 'u', name: id, balance, account_type: type, is_liquid: true, sort_order: 0,
    coingecko_id: null, crypto_amount: null, created_at: '',
  });
  const holding = (id: string, assetClass: ValuedHolding['assetClass'], valuePln: number): ValuedHolding => ({
    id, ticker: id, name: id, assetClass, quantity: 1, avgCostPln: 1, targetWeightPct: null, pricePln: valuePln,
    hasQuote: true, valuePln, costPln: valuePln, pnlPln: 0, pnlPct: 0, dayChangePct: null, dayChangePln: 0, weightPct: 0,
  });

  it('merges accounts and holdings, skips debts and sorts by amount', () => {
    const slices = buildAllocationSlices(
      [account('a', 'bank', 1000), account('b', 'other', -500), account('c', 'cash', 200)],
      [holding('h1', 'etf', 3000), holding('h2', 'etf', 1000)],
    );

    expect(slices.map((slice) => slice.label)).toEqual(['ETF', 'Bank', 'Gotówka']);
    expect(slices[0].amount).toBe(4000);
    expect(slices.reduce((sum, slice) => sum + slice.pct, 0)).toBeCloseTo(100, 5);
  });

  it('returns nothing when there is no positive value', () => {
    expect(buildAllocationSlices([], [])).toEqual([]);
  });
});
