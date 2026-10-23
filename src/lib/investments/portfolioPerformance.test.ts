import { beforeEach, expect, it, vi } from 'vitest';
import { computePortfolioPerformance, fetchPortfolioPerformance, priceSymbol } from './portfolioPerformance';
import { buildAllocation } from './portfolioAllocation';
import { orcaSelect } from './superinvestorsApi';
import type { PortfolioPosition } from './jakubPortfolioStorage';
vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));
vi.mock('../date', async original => ({ ...await original<typeof import('../date')>(), getTodayWarsaw: () => '2026-10-23' }));
vi.mock('../supabase', () => ({ invokeEdge: vi.fn() }));

const pos = (ticker: string, market: PortfolioPosition['market'], currentValue: number): PortfolioPosition => ({
  id: ticker, ticker, name: ticker, type: 'Akcje', market, shares: 1, avgBuyPrice: 1, currentPrice: currentValue,
  currentValue, pnlPln: 0, pnlPct: 0 });
const row = (ticker: string, date: string, close: number, currency = 'USD') => ({ ticker, date, close_raw: close, currency });

beforeEach(() => { vi.mocked(orcaSelect).mockReset().mockResolvedValue([]); });

it('maps broker tickers to prices_daily symbols', () => {
  expect(priceSymbol({ ticker: 'XTB', market: 'GPW' })).toBe('XTB.WA');
  expect(priceSymbol({ ticker: 'BRK.B', market: 'US' })).toBe('BRK-B');
  expect(priceSymbol({ ticker: 'CSPX', market: 'EU' })).toBe('CSPX.L');
});
it('computes YTD, daily change and alpha vs SPY with coverage', () => {
  const base = [row('NVDA', '2026-01-02', 100), row('SPY', '2026-01-02', 100)];
  const latest = [row('NVDA', '2026-10-22', 190), row('NVDA', '2026-10-23', 200), row('SPY', '2026-10-22', 110), row('SPY', '2026-10-23', 110)];
  const result = computePortfolioPerformance([pos('NVDA', 'US', 1000), pos('NODATA', 'US', 1000)], base, latest, '2026-10-23');
  expect(result.ytdPct).toBeCloseTo(100);
  expect(result.benchmarkYtdPct).toBeCloseTo(10);
  expect(result.alphaPp).toBeCloseTo(90);
  expect(result.dayPct).toBeCloseTo((200 / 190 - 1) * 100);
  expect(result.coveragePct).toBeCloseTo(50);
  expect(result.baselineDate).toBe('2026-01-02');
  expect(result.positions.find(p => p.ticker === 'NODATA')?.ytdPct).toBeNull();
});
it('does not compare prices in different currencies or stale quotes', () => {
  const mixed = computePortfolioPerformance([pos('A', 'US', 100)], [row('A', '2026-01-02', 10, 'PLN')],
    [row('A', '2026-10-23', 12)], '2026-10-23');
  expect(mixed.ytdPct).toBeNull();
  const stale = computePortfolioPerformance([pos('A', 'US', 100)], [row('A', '2026-01-02', 10)], [row('A', '2026-09-01', 12)], '2026-10-23');
  expect(stale.ytdPct).toBeNull();
});
it('reads only narrow windows bounded by 1 January', async () => {
  await fetchPortfolioPerformance([pos('NVDA', 'US', 100)]);
  const paths = vi.mocked(orcaSelect).mock.calls.map(([p]) => decodeURIComponent(p));
  expect(paths).toHaveLength(2);
  for (const path of paths) {
    expect(path).toContain('select=ticker,date,close_raw,currency');
    expect(path).toContain('ticker=in.(NVDA,SPY)');
  }
  expect(paths[0]).toContain('date=gte.2026-01-01');
  expect(paths[1]).toContain('date=gte.2026-10-16');
});
it('builds allocation with cash and folds the tail', () => {
  const positions = Array.from({ length: 9 }, (_, i) => pos(`T${i}`, i % 2 ? 'GPW' : 'US', 100 - i));
  const alloc = buildAllocation(positions, 50);
  expect(alloc.slices).toHaveLength(7);
  expect(alloc.slices.at(-1)?.label).toContain('Pozostałe');
  expect(alloc.slices.reduce((s, x) => s + x.weightPct, 0)).toBeCloseTo(100);
  expect(alloc.byMarket.map(m => m.label)).toContain('Gotówka');
  expect(alloc.top3Pct).toBeGreaterThan(0);
});
