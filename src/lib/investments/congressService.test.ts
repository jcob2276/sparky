import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCongressOverview } from './congressService';
import { orcaSelect } from './superinvestorsApi';
import { yearFloor } from './yearFloor';

vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));

describe('Congress overview uses disclosed evidence', () => {
  beforeEach(() => { vi.mocked(orcaSelect).mockReset(); });

  it('does not invent Pelosi purchases, rankings or returns when the source is empty', async () => {
    vi.mocked(orcaSelect).mockResolvedValue([]);
    const overview = await fetchCongressOverview();
    expect(overview.topBought).toEqual([]);
    expect(overview.largestTrades).toEqual([]);
    expect(overview.rankings).toEqual([]);
    expect(overview.partyActivity.democrats.tradesCount).toBe(0);
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
    expect(overview.partyActivity.republicans.tradesCount).toBe(0);
    expect(overview.stream[0]).toMatchObject({ type: 'buy', owner: 'spouse',
      disclosureDate: '2026-10-02', transactionDate: '2026-09-08',
      sourceUrl: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20035553.pdf' });
  });

  it('filters names and tickers in the database before pagination', async () => {
    vi.mocked(orcaSelect).mockImplementation(async path => path.startsWith('politicians?')
      ? [{ id: 'nancy', display_name: 'Nancy Pelosi', chamber: 'house', party: 'D' },
        { id: 'senator', display_name: 'Pelosi Senator', chamber: 'senate', party: 'D' },
        { id: 'republican', display_name: 'Pelosi Republican', chamber: 'house', party: 'R' }] : []);
    await fetchCongressOverview({ searchQuery: 'Pelosi', tickerQuery: 'NVDA', party: 'D', chamber: 'house' });
    const path = decodeURIComponent(vi.mocked(orcaSelect).mock.calls.find(([query]) => query.startsWith('stock_act_trades?'))?.[0] ?? '');
    expect(path).toContain('politician_id.in.(nancy)');
    expect(path).not.toContain('senator');
    expect(path).not.toContain('republican');
    expect(path).toContain('ticker.ilike.*NVDA*');
    expect(path).toContain('asset_description.ilike.*NVDA*');
    expect(path).toContain('disclosure_date=lte.');
  });

  it('matches unlinked filer names as well as linked politician identities', async () => {
    vi.mocked(orcaSelect).mockImplementation(async path => path.startsWith('politicians?')
      ? [{ id: 'nancy', display_name: 'Nancy Pelosi', chamber: 'house', party: 'D' }] : []);
    await fetchCongressOverview({ searchQuery: 'Pelosi', chamber: 'house' });
    const path = decodeURIComponent(vi.mocked(orcaSelect).mock.calls.find(([query]) => query.startsWith('stock_act_trades?'))?.[0] ?? '');
    expect(path).toContain('politician_id.in.(nancy)');
    expect(path).toContain('politician_id.is.null');
    expect(path).toContain('filer_name.ilike.*Pelosi*');
    expect(path).toContain('chamber.eq.house');
  });

  it('does not read the entire trade catalogue for an unmatched party', async () => {
    vi.mocked(orcaSelect).mockResolvedValue([]);
    const data = await fetchCongressOverview({ party: 'D' });
    expect(data.stream).toEqual([]);
    expect(vi.mocked(orcaSelect).mock.calls.some(([path]) => path.startsWith('stock_act_trades?'))).toBe(false);
  });

  it('shows a paper disclosure without inventing its ticker or including it in ticker rankings', async () => {
    vi.mocked(orcaSelect).mockImplementation(async path => path.startsWith('stock_act_trades?') ? [{
      id: 'house-2026-9116342-0', filer_name: 'Harold Dallas Rogers', chamber: 'house',
      ticker: null, asset_description: 'Redeemed Electronic Arts', transaction_type: 'sell',
      transaction_date: '2026-08-05', disclosure_date: '2026-09-23',
      amount_low: 1001, amount_high: 15000, owner: 'self',
      source_url: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/9116342.pdf',
    }] : []);
    const overview = await fetchCongressOverview();
    expect(overview.stream).toHaveLength(1);
    expect(overview.stream[0]).toMatchObject({ politicianName: 'Harold Dallas Rogers',
      ticker: '—', companyName: 'Redeemed Electronic Arts', type: 'sell', owner: 'self',
      transactionDate: '2026-08-05', disclosureDate: '2026-09-23',
      sourceUrl: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/9116342.pdf' });
    expect(overview.topSold).toEqual([]);
  });

  it('never reads before the current-year floor and ranks politicians by disclosed activity', async () => {
    vi.mocked(orcaSelect).mockImplementation(async path => path.startsWith('politicians?')
      ? [{ id: 'a', display_name: 'A One', chamber: 'house', party: 'D', state: 'CA' },
        { id: 'b', display_name: 'B Two', chamber: 'senate', party: 'R', state: 'TX' }]
      : path.startsWith('stock_act_trades?') ? [
        { id: '1', politician_id: 'a', ticker: 'NVDA', transaction_type: 'Purchase', disclosure_date: '2026-10-02', amount_low: 1001, amount_high: 15000 },
        { id: '2', politician_id: 'b', ticker: 'AMD', transaction_type: 'Purchase', disclosure_date: '2026-10-03', amount_low: 15001, amount_high: 50000 },
        { id: '3', politician_id: 'b', ticker: 'AMD', transaction_type: 'Sale', disclosure_date: '2026-10-04', amount_low: 15001, amount_high: 50000 },
      ] : []);
    const overview = await fetchCongressOverview({ timeframe: 'ytd' });
    const path = vi.mocked(orcaSelect).mock.calls.find(([query]) => query.startsWith('stock_act_trades?'))?.[0] ?? '';
    expect(path).toContain(`disclosure_date=gte.${yearFloor()}`);
    expect(path).toContain('select=');
    expect(overview.coverage.since).toBe(yearFloor());
    expect(overview.rankings.map((r) => r.name)).toEqual(['B Two', 'A One']);
    expect(overview.rankings[0]).toMatchObject({ tradesCount: 2, buysCount: 1, sellsCount: 1, volumeLowUsd: 30002, volumeHighUsd: 100000 });
  });
});
