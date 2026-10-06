import { afterEach, expect, it, vi } from 'vitest';
import { fetchEnrichedConsensus } from './consensusService';
import { orcaSelect } from './superinvestorsApi';
vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));
afterEach(() => { vi.resetAllMocks(); vi.useRealTimers(); });

it('uses complete SEC comparisons and preserves zero holders for absent positions', async () => {
  vi.mocked(orcaSelect).mockImplementation(async path => path.startsWith('vw_sec13f_screener') ? [
    { ticker: 'AAPL', holders: 0, compared_funds: 2, reported_increases: 0,
      reported_decreases: 2, net_changes: -2, total_value: 0,
      period_of_report: '2026-06-30', previous_period: '2026-03-31',
      source_urls: ['https://www.sec.gov/Archives/edgar/data/1/a/', 'https://example.com/untrusted'] },
    { ticker: 'NVDA', holders: 3, compared_funds: 0, reported_increases: null,
      reported_decreases: null, net_changes: null, total_value: 1200 },
  ] : []);
  const { items, stats } = await fetchEnrichedConsensus();
  expect(items[0]).toMatchObject({ totalFunds: 0, fundsSelling: 2, netScore: -2,
    comparedFunds: 2, sector: '—', sourceUrls: ['https://www.sec.gov/Archives/edgar/data/1/a/'] });
  expect(items[1]).toMatchObject({ comparedFunds: 0, movementType: 'neutral' });
  expect(stats).toMatchObject({ topBoughtTicker: '—', topSoldTicker: 'AAPL', totalMoves: 2 });
  expect(vi.mocked(orcaSelect).mock.calls.some(([path]) => path.startsWith('vw_consensus?'))).toBe(false);
});

it('rejects future and unsourced prices, preserves quote dates and does not label stale changes today', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
  vi.mocked(orcaSelect).mockImplementation(async path => {
    if (path.startsWith('vw_sec13f_screener')) return [{ ticker: 'AAPL', holders: 1 }];
    if (path.startsWith('prices_daily')) return [
      { ticker: 'AAPL', date: '2026-10-07', close_raw: 999, currency: 'USD', source_url: 'source' },
      { ticker: 'AAPL', date: '2026-10-06', close_raw: 888 },
      { ticker: 'AAPL', date: '2026-10-05', close_raw: 105, currency: 'USD', source_url: 'source' },
      { ticker: 'AAPL', date: '2026-10-02', close_raw: 100, currency: 'USD', source_url: 'source' },
    ];
    return [];
  });
  expect((await fetchEnrichedConsensus()).items[0]).toMatchObject({
    priceUsd: 105, priceDate: '2026-10-05', changeToday: null, sparkline: [100, 105],
  });
});

it('surfaces failed SEC reads instead of reporting a successful empty screen', async () => {
  vi.mocked(orcaSelect).mockRejectedValue(new Error('SEC read failed'));
  await expect(fetchEnrichedConsensus()).rejects.toThrow('SEC read failed');
});

it('reads the actual US share-class symbol while preserving its SEC identity', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
  vi.mocked(orcaSelect).mockImplementation(async path => path.startsWith('vw_sec13f_screener')
    ? [{ ticker: 'BRK/B', holders: 2 }]
    : path.startsWith('prices_daily') ? [{ ticker: 'BRK-B', date: '2026-10-06',
      close_raw: 500, currency: 'USD', source_url: 'source' }] : []);
  expect((await fetchEnrichedConsensus()).items[0]).toMatchObject({ ticker: 'BRK/B', priceUsd: 500 });
  expect(vi.mocked(orcaSelect).mock.calls.some(([path]) => path.includes('ticker=in.(BRK-B)'))).toBe(true);
});

it.each(['delisted', 'halted'])('keeps %s companies in historical reports without presenting a current tradable price', async status => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
  vi.mocked(orcaSelect).mockImplementation(async path => {
    if (path.startsWith('vw_sec13f_screener')) return [{ ticker: 'JHG', holders: 1 }];
    if (path.startsWith('companies')) return [{ ticker: 'JHG', listing_status: status,
      listing_status_date: '2026-06-30', listing_source_url: 'https://issuer.test/announcement' }];
    if (path.startsWith('prices_daily')) return [{ ticker: 'JHG', date: '2026-10-06',
      close_raw: 52, currency: 'USD', source_url: 'source' }];
    return [];
  });
  expect((await fetchEnrichedConsensus()).items[0]).toMatchObject({ priceUsd: null,
    changeToday: null, listingStatus: status, listingStatusDate: '2026-06-30' });
});
