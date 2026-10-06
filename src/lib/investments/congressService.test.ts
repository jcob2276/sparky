import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCongressOverview } from './congressService';
import { orcaSelect } from './superinvestorsApi';

vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));

describe('Congress overview uses disclosed evidence', () => {
  beforeEach(() => { vi.mocked(orcaSelect).mockReset(); });

  it('does not invent Pelosi purchases, rankings or returns when the source is empty', async () => {
    vi.mocked(orcaSelect).mockResolvedValue([]);
    const overview = await fetchCongressOverview();
    expect(overview.topBought).toEqual([]);
    expect(overview.largestTrades).toEqual([]);
    expect(overview.rankings).toEqual([]);
    expect(overview.partyReturns.democrats.pct).toBeNull();
  });

  it('applies filters to all summaries and preserves the official document and owner', async () => {
    vi.mocked(orcaSelect).mockImplementation(async (path) => path.startsWith('politicians') ? [
      { id: 'nancy', display_name: 'Nancy Pelosi', chamber: 'house', party: 'D', state: 'CA' },
      { id: 'senator', display_name: 'A Senator', chamber: 'senate', party: 'R' },
    ] : path.startsWith('stock_act_trades') ? [
      { id: 'house', politician_id: 'nancy', ticker: 'NVDA', transaction_type: 'Purchase',
        transaction_date: '2026-09-08', disclosure_date: '2026-10-02', amount_low: 1001, amount_high: 15000,
        source_url: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20035553.pdf', owner: 'spouse' },
      { id: 'senate', politician_id: 'senator', ticker: 'AMD', transaction_type: 'buy',
        transaction_date: '2026-09-08', disclosure_date: '2026-10-02', amount_low: 1001, amount_high: 15000 },
    ] : []);
    const overview = await fetchCongressOverview({ chamber: 'house' });
    expect(overview.topBought.map((t) => t.ticker)).toEqual(['NVDA']);
    expect(overview.partyReturns.republicans.tradesCount).toBe(0);
    expect(overview.stream[0]).toMatchObject({ type: 'buy', owner: 'spouse',
      disclosureDate: '2026-10-02', transactionDate: '2026-09-08',
      sourceUrl: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20035553.pdf' });
  });
});
