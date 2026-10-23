import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  computeGpwInsiderClusters, computeGpwInsiderDailyCells, computeGpwInsiderKpis, type GpwInsiderNotice,
} from './gpwInsidersStats';
import { fetchGpwInsiderLiveFeed, fetchGpwInsiderNoticesYtd } from './gpwInsidersService';
import { orcaSelect } from './superinvestorsApi';

vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));
vi.mock('../date', async (original) => ({ ...await original<typeof import('../date')>(), getTodayWarsaw: () => '2026-10-23' }));

const n = (id: string, ticker: string, side: GpwInsiderNotice['side'], tx: string): GpwInsiderNotice => ({
  id, ticker, company: ticker, side, transactionDate: tx, reportDate: tx, title: 'MAR',
});

describe('GPW insider stats', () => {
  const rows = [
    n('1', 'DVL', 'buy', '2026-07-15'), n('2', 'DVL', 'buy', '2026-07-20'), n('3', 'DVL', 'buy', '2026-09-01'),
    n('4', 'ZAB', 'sell', '2026-10-10'), n('5', 'CDR', 'buy', '2026-10-20'),
  ];

  it('counts purchases, sales and the busiest ticker from real rows only', () => {
    const k = computeGpwInsiderKpis(rows, '2026-10-23', '2026-01-01');
    expect([k.purchases, k.sales, k.total]).toEqual([4, 1, 5]);
    expect([k.mostActiveTicker, k.mostActiveCount]).toEqual(['DVL', 3]);
    expect(k.tempo30d).toBe(2);
    expect(k.latestReportDate).toBe('2026-10-20');
  });

  it('returns empty KPIs for no rows instead of sample numbers', () => {
    const k = computeGpwInsiderKpis([], '2026-01-05', '2026-01-01');
    expect([k.total, k.mostActiveTicker, k.medianPerCompany]).toEqual([0, null, 0]);
  });

  it('clusters only buys within 14 days of each other', () => {
    const c = computeGpwInsiderClusters(rows);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ ticker: 'DVL', tradesCount: 2, dateFrom: '2026-07-15', dateTo: '2026-07-20' });
  });

  it('builds a daily series from 1 January to today', () => {
    const cells = computeGpwInsiderDailyCells(rows, '2026-10-19', '2026-10-23');
    expect(cells.map((x) => x.date)[0]).toBe('2026-10-19');
    expect(cells).toHaveLength(5);
    expect(cells.find((x) => x.date === '2026-10-20')?.count).toBe(1);
  });
});

describe('GPW insider reads respect the year floor', () => {
  const read = vi.mocked(orcaSelect);
  beforeEach(() => { read.mockReset().mockResolvedValue([]); });
  it('filters YTD and live-feed queries from 1 January', async () => {
    await fetchGpwInsiderNoticesYtd();
    await fetchGpwInsiderLiveFeed({ side: 'buy' });
    for (const [path] of read.mock.calls) expect(path).toContain('report_date=gte.2026-01-01');
  });
});
