import { describe, expect, it, vi } from 'vitest';
vi.mock('../supabase', () => ({ invokeEdge: vi.fn() }));
import { updatePositionsWithQuotes, portfolioQuoteTicker, portfolioValuationAsOf } from './portfolioSyncService';
import { calculatePortfolioForecast } from './portfolioForecastService';
import type { JakubPortfolioData } from './jakubPortfolioStorage';

const portfolio: JakubPortfolioData = {
  accountName: 'Test', totalValuePln: 410, marketValuePln: 400, freeCashPln: 10,
  totalPnlPln: 0, totalPnlPct: 0, lastUpdated: '2025-01-01T00:00:00Z',
  positions: [{ id: '1', ticker: 'AMZN.US', name: 'Amazon', market: 'US', type: 'Akcje',
    shares: 2, avgBuyPrice: 200, currentPrice: 200, currentValue: 400, pnlPln: 0, pnlPct: 0 }],
};

describe('truthful portfolio valuation', () => {
  it('does not present a local snapshot save timestamp as market freshness', () => {
    expect(portfolioValuationAsOf(portfolio)).toBeNull();
  });
  it('preserves snapshot and freshness when quotes fail', () => {
    expect(updatePositionsWithQuotes(portfolio, {}).updated).toBe(portfolio);
  });
  it('uses PLN conversion exactly once and source time instead of fetch time', () => {
    const { updated, syncedCount } = updatePositionsWithQuotes(portfolio, {
      AMZN: { ticker: 'AMZN.US', symbol: 'AMZN', price: 100, pricePln: 380,
        currency: 'USD', quoteAsOf: '2026-10-05T20:00:00Z', source: 'Yahoo', sourceUrl: 'https://finance.yahoo.com/quote/AMZN' },
    });
    expect(syncedCount).toBe(1);
    expect(updated.positions[0].currentValue).toBe(760);
    expect(updated.lastUpdated).toBe('2026-10-05T20:00:00Z');
  });
  it('does not convert an unknown currency or undocumented quote', () => {
    expect(updatePositionsWithQuotes(portfolio, { 'AMZN.US': { price: 100, currency: 'GBp', pricePln: null } }).syncedCount).toBe(0);
  });
  it('maps market suffixes without substituting another exchange', () => {
    expect(portfolioQuoteTicker({ ticker: 'XTB', market: 'GPW' })).toBe('XTB.WA');
    expect(portfolioQuoteTicker({ ticker: 'CSPX.UK', market: 'EU' })).toBe('CSPX.L');
    expect(portfolioQuoteTicker({ ticker: 'AMZN.US', market: 'US' })).toBe('AMZN');
  });
  it('partial refresh leaves overall snapshot time unchanged', () => {
    const two = { ...portfolio, positions: [...portfolio.positions, { ...portfolio.positions[0], id: '2', ticker: 'NVDA.US' }] };
    const { updated } = updatePositionsWithQuotes(two, { AMZN: { price: 100, pricePln: 380, currency: 'USD', quoteAsOf: '2026-10-05T20:00:00Z', source: 'Yahoo' } });
    expect(updated.lastUpdated).toBe(two.lastUpdated);
    expect(updated.positions[1]).toBe(two.positions[1]);
  });
  it('never replaces a more recent provider observation with an older one', () => {
    const newer = { ...portfolio, positions: [{ ...portfolio.positions[0], quoteAsOf: '2026-10-06T10:00:00Z' }] };
    const result = updatePositionsWithQuotes(newer, { AMZN: { price: 100, pricePln: 380, currency: 'USD', quoteAsOf: '2026-10-05T20:00:00Z', source: 'Yahoo' } });
    expect(result.syncedCount).toBe(0);
    expect(result.updated).toBe(newer);
  });
});

describe('scenario assumptions are not analyst consensus', () => {
  it('keeps consensus, ratings, analysts and probability unknown', () => {
    const model = calculatePortfolioForecast(portfolio);
    expect(model.positions[0].meanTargetPricePln).toBeNull();
    expect(model.positions[0].rating).toBeNull();
    expect(model.positions[0].numAnalysts).toBeNull();
    expect(model.scenarios.base.probabilityPct).toBeNull();
    expect(model.scenarios.base.simulatedPortfolioValuePln).toBeNull();
  });
  it('computes only explicit manual assumptions including cash', () => {
    const model = calculatePortfolioForecast(portfolio, 12, { bull: 20, base: 0, bear: -50 });
    expect(model.scenarios.bull.simulatedPortfolioValuePln).toBe(490);
    expect(model.scenarios.base.simulatedPortfolioValuePln).toBe(410);
    expect(model.scenarios.bear.simulatedPortfolioValuePln).toBe(210);
    expect(model.positions[0].meanTargetPricePln).toBeNull();
  });
  it('rejects impossible returns and does not fabricate ROI for an empty portfolio', () => {
    expect(calculatePortfolioForecast(portfolio, 6, { bull: -101 }).scenarios.bull.simulatedPortfolioValuePln).toBeNull();
    expect(calculatePortfolioForecast({ ...portfolio, positions: [], freeCashPln: 0 }, 12, { base: 10 }).scenarios.base.simulatedRoiPct).toBeNull();
  });
});
