import { expect, it, vi } from 'vitest';
import type { JakubPortfolioData } from './jakubPortfolioStorage';
const state = vi.hoisted(() => ({ current: null as unknown as JakubPortfolioData, save: vi.fn() }));
vi.mock('../supabase', () => ({ invokeEdge: vi.fn() }));
vi.mock('./jakubPortfolioStorage', () => ({ loadJakubPortfolio: () => state.current, saveJakubPortfolio: state.save }));
import { invokeEdge } from '../supabase';
import { syncPortfolioMarketPrices } from './portfolioSyncService';

it('keeps portfolio edits made while quotes are in flight', async () => {
  state.current = { accountName: 'Local', freeCashPln: 10, marketValuePln: 10, totalValuePln: 20,
    totalPnlPln: 0, totalPnlPct: 0, lastUpdated: '2025-01-01T00:00:00Z', positions: [
      { id: '1', ticker: 'AMZN', name: 'Amazon', type: 'Akcje', market: 'US', shares: 1,
        avgBuyPrice: 10, currentPrice: 10, currentValue: 10, pnlPln: 0, pnlPct: 0 },
    ] };
  let release!: (value: Record<string, unknown>) => void;
  vi.mocked(invokeEdge).mockImplementation(() => new Promise((resolve) => { release = resolve; }));
  const pending = syncPortfolioMarketPrices();
  state.current = { ...state.current, freeCashPln: 123, positions: [{ ...state.current.positions[0], shares: 5 }] };
  release({ ok: true, quotes: { AMZN: { price: 10, pricePln: 40, currency: 'USD', quoteAsOf: '2026-10-05T20:00:00Z', source: 'Yahoo' } } });
  const result = await pending;
  expect(result.portfolio.freeCashPln).toBe(123);
  expect(result.portfolio.positions[0].shares).toBe(5);
  expect(result.portfolio.totalValuePln).toBe(323);
});
