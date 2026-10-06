import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGpwStocksList } from './gpwCompaniesService';
vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));
import { orcaSelect } from './superinvestorsApi';
const read = vi.mocked(orcaSelect);
afterEach(() => { vi.restoreAllMocks(); });

function sources(rows: Record<string, unknown[]> = {}) {
  read.mockImplementation(async path => rows[path.split('?')[0]] ?? []);
}
describe('GPW company list uses observed evidence', () => {
  it('counts a listing once when the issuer registry contains duplicate tickers', async () => {
    sources({ gpw_companies: [{ ticker: 'MDV', name: 'MODIVO' }, { ticker: 'MDV', name: 'MODIVO' }],
      vw_gpw_shorts_agg: [{ ticker: 'MDV', total_pct: 4.37 }] });
    const result = await fetchGpwStocksList();
    expect(result.stocks).toHaveLength(1);
    expect(result.summary.activeShorts).toBe(1);
  });
  it('does not invent counters or price curves for missing records', async () => {
    sources({ gpw_companies: [{ ticker: 'XTB', isin: 'PLXTB0000015', name: 'XTB' }] });
    const result = await fetchGpwStocksList();
    expect(result.summary).toEqual({ total: 1, activeShorts: 0, insiderBuys: 0, convergenceSignals: 0 });
    expect(result.stocks[0]).toMatchObject({ close: null, sparkline12m: [], diff14dPp: null });
  });
  it('propagates a required source failure', async () => {
    read.mockRejectedValue(new Error('database unavailable'));
    await expect(fetchGpwStocksList()).rejects.toThrow('database unavailable');
  });
  it('uses current KNF aggregates and only a genuine fourteen-day baseline', async () => {
    sources({ gpw_companies: [{ ticker: 'XTB' }],
      vw_gpw_shorts_agg: [{ ticker: 'XTB', total_pct: 1.2 }],
      vw_knf_shorts_baseline_14d: [],
      vw_gpw_price_summary: [{ ticker: 'XTB.WA', close: 138, price_date: '2026-10-05',
        change_pct: 5, points: [{ date: '2026-10-02', price: 130 }, { date: '2026-10-05', price: 138 }] }],
    });
    const result = await fetchGpwStocksList();
    expect(result.stocks[0]).toMatchObject({ shortPct: 1.2, diff14dPp: null, close: 138,
      priceDate: '2026-10-05', changeTodayPct: null, sparkline12m: [130, 138] });
  });
});
