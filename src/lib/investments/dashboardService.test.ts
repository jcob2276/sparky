import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDashboardData } from './dashboardService';
import { orcaSelect } from './superinvestorsApi';
vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));
vi.mock('../date', async (original) => ({ ...await original<typeof import('../date')>(), getTodayWarsaw: () => '2026-10-06' }));
const read = vi.mocked(orcaSelect);
describe('dashboard evidence', () => {
  beforeEach(() => { read.mockReset().mockResolvedValue([]); });
  it('never invents counts, picks or peaks on an empty successful read', async () => {
    const data = await fetchDashboardData();
    expect(data.topConsensus).toBeNull();
    expect(data.maxShort).toBeNull();
    expect(data.congress14).toEqual({ total: 0, sales: 0, buys: 0 });
    expect(data.activity14d.total).toBe(0);
    expect(data.activity14d.peakDateLabel).toBeNull();
    expect(data.topConvergenceUsa).toEqual([]);
  });
  it('uses verified 13F changes rather than cached transaction claims', async () => {
    read.mockImplementation(async path => path.startsWith('vw_sec13f_screener')
      ? [{ ticker: 'CVNA', net_changes: 14, company_name: 'Carvana' }]
      : path.startsWith('vw_consensus') ? [{ ticker: 'FAKE', net_buyers: 999 }] : []);
    const data = await fetchDashboardData();
    expect(data.topConsensus).toEqual({ ticker: 'CVNA', net: 14 });
    expect(read.mock.calls.some(([path]) => path.startsWith('vw_consensus'))).toBe(false);
  });
  it('counts all rows in the same 14 calendar days and not just the displayed stream', async () => {
    read.mockImplementation(async (path) => (path ?? "").startsWith('stock_act_trades?') ?
      Array.from({ length: 40 }, (_, i) => ({ id: String(i), ticker: 'AAPL', transaction_type: 'Sale', disclosure_date: '2026-09-23' }))
        .concat([{ id: 'old', ticker: 'AAPL', transaction_type: 'Sale', disclosure_date: '2026-09-22' }, { id: 'future', ticker: 'AAPL', transaction_type: 'Sale', disclosure_date: '2026-10-07' }]) : []);
    const data = await fetchDashboardData(['AAPL']);
    expect(data.congress14?.total).toBe(40);
    expect(data.activity14d.total).toBe(40);
    expect(data.watchlist14Count).toBe(40);
    expect(data.activity14d.peakDateLabel).toContain('23');
  });
  it('keeps a failed source unavailable rather than reporting zero', async () => {
    read.mockImplementation(async (path) => { if ((path ?? "").startsWith('stock_act_trades?')) throw new Error('HTTP 503'); return []; });
    const data = await fetchDashboardData();
    expect(data.congress14).toBeNull();
    expect(data.activity14d.sources.politicians).toBeNull();
    expect(data.issues).toContain('Kongres: HTTP 503');
  });
  it('reads canonical KNF evidence with stable event identity', async () => {
    read.mockImplementation(async (path) => (path ?? '').startsWith('knf_disclosed_positions?')
      ? [{ external_id: 'knf:official-event', ticker: 'KRU', holder: 'Official holder', position_pct: 0.53, position_date: '2026-10-01' }]
      : []);
    const data = await fetchDashboardData();
    expect(data.activity14d.sources.shorts).toBe(1);
    expect(data.streamItems.find(item => item.sourceType === 'KNF')?.id).toBe('knf_knf:official-event');
  });
});

