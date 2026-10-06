import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchGpwShortsData, fetchShortVsPriceChart } from './gpwShortsService';
import { orcaSelect } from './superinvestorsApi';
vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));
vi.mock('../date', async (original) => ({ ...await original<typeof import('../date')>(), getTodayWarsaw: () => '2026-10-06' }));
const read = vi.mocked(orcaSelect);
describe('official KNF analytics', () => {
  beforeEach(() => { read.mockReset().mockResolvedValue([]); });
  it('does not populate an empty register with sample figures or movers', async () => {
    const result = await fetchGpwShortsData();
    expect(result.kpis.totalCompanies).toBe(0);
    expect(result.kpis.activePositions).toBe(0);
    expect(result.kpis.highestShortPct).toBeNull();
    expect(result.increases).toEqual([]);
    expect(result.decreases).toEqual([]);
  });
  it('exposes a source read failure', async () => {
    read.mockRejectedValue(new Error('HTTP 503'));
    await expect(fetchGpwShortsData()).rejects.toThrow('HTTP 503');
  });
  it('uses actual holder counts and the latest change across all companies', async () => {
    read.mockImplementation(async (path) => (path ?? "").startsWith('vw_gpw_shorts_agg?') ? [
      { company: 'FIRST', ticker: 'ONE', total_pct: 2, public_holders: 2, last_change: '2026-09-30' },
      { company: 'SECOND', ticker: 'TWO', total_pct: 1, public_holders: 1, last_change: '2026-10-02' },
    ] : (path ?? "").startsWith('vw_knf_shorts_baseline_14d?') ? [
      { ticker: 'ONE', company: 'FIRST', total_pct: 1.5, position_date: '2026-09-22' },
      { ticker: 'TWO', company: 'SECOND', total_pct: 0.9, position_date: '2026-10-01' },
    ] : []);
    const result = await fetchGpwShortsData();
    expect(result.kpis.activePositions).toBe(3);
    expect(result.kpis.lastRegisterChange).toBe('2026-10-02');
    expect(result.companies.find(c => c.ticker === 'ONE')?.diff14d).toBe(0.5);
    expect(result.companies.find(c => c.ticker === 'TWO')?.diff14d).toBeNull();
    expect(result.increases).toEqual([{ ticker: 'ONE', name: 'FIRST', diff14d: 0.5 }]);
  });
  it('never fabricates chart prices or a position before the first disclosure', async () => {
    read.mockImplementation(async (path) => (path ?? "").startsWith('prices_daily?') ? [
      { date: '2026-10-01', close_raw: 100, currency: 'PLN' },
      { date: '2026-10-05', close_raw: 110, currency: 'PLN' },
    ] : (path ?? "").startsWith('knf_short_snapshots?') ? [
      { ticker: 'CDR', company: 'CDPROJEKT', position_date: '2026-10-02', total_pct: 0.7 },
    ] : []);
    const chart = await fetchShortVsPriceChart('CDR', 'CDPROJEKT');
    expect(chart.latestPrice).toBe(110);
    expect(chart.points.find(p => p.date === '2026-10-01')?.shortPct).toBeNull();
    expect(chart.points.find(p => p.date === '2026-10-05')?.shortPct).toBe(0.7);
    read.mockResolvedValue([]);
    const empty = await fetchShortVsPriceChart('CDR', 'CDPROJEKT');
    expect(empty.latestPrice).toBeNull();
    expect(empty.shortPct).toBeNull();
    expect(empty.points).toEqual([]);
  });
  it('keeps archived holder reports separate from observed aggregate history', async () => {
    read.mockImplementation(async (path) => (path ?? '').startsWith('knf_disclosed_positions?') ? [
      { holder: 'Past holder', position_pct: 2, position_date: '2026-09-20', source_url: 'https://rss.knf.gov.pl/rss_pub/' },
    ] : []);
    const chart = await fetchShortVsPriceChart('CDR', 'CDPROJEKT');
    expect(chart.shortPct).toBeNull();
    expect(chart.points).toEqual([]);
    expect(chart.reportedPositions).toEqual([{ holder: 'Past holder', pct: 2, date: '2026-09-20', sourceUrl: 'https://rss.knf.gov.pl/rss_pub/' }]);
  });
});


