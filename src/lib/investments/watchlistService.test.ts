import { beforeEach, expect, it, vi } from 'vitest';
import { fetchWatchlistDetails, resolveWatchlistTicker, searchWatchlistCompanies } from './watchlistService';
import { orcaSelect } from './superinvestorsApi';
vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));
vi.mock('../date', async original => ({ ...await original<typeof import('../date')>(), getTodayWarsaw: () => '2026-10-06' }));
const read = vi.mocked(orcaSelect);
beforeEach(() => { read.mockReset().mockResolvedValue([]); });

it('keeps GPW and US quotes separate for the same ticker', async () => {
  read.mockImplementation(async path => path.startsWith('prices_daily') ? [
    { ticker: 'ABC.WA', date: '2026-10-06', close_raw: 40, currency: 'PLN', source_url: 'https://example.com/gpw' },
    { ticker: 'ABC', date: '2026-10-06', close_raw: 90, currency: 'USD', source_url: 'https://example.com/us' },
  ] : []);
  const items = await fetchWatchlistDetails(['ABC.WA', 'ABC.US']);
  expect(items.map(item => [item.market, item.price])).toEqual([['GPW', '40.00 PLN'], ['USA', '90.00 USD']]);
});

it('shows dated prices without fabricating a daily change or a 13F comparison', async () => {
  read.mockImplementation(async path => path.startsWith('prices_daily') ? [
    { ticker: 'ABC', date: '2026-10-04', close_raw: 80, currency: 'USD', source_url: 'https://example.com/us' },
    { ticker: 'ABC', date: '2026-10-05', close_raw: 90, currency: 'USD', source_url: 'https://example.com/us' },
    { ticker: 'ABC', date: '2026-10-06', close_raw: 99, currency: 'USD' },
  ] : []);
  const [item] = await fetchWatchlistDetails(['ABC.US']);
  expect(item.price).toBe('90.00 USD');
  expect(item.priceDate).toBe('2026-10-05');
  expect(item.changePercent).toBeNull();
  expect(item.signalsCount).toBeNull();
});

it('retains verified 13F evidence when quotes fail', async () => {
  read.mockImplementation(async path => {
    if (path.startsWith('prices_daily')) throw new Error('503');
    return path.startsWith('vw_sec13f_screener') ? [{ ticker: 'ABC', compared_funds: 3,
      net_changes: 1, reported_increases: 2, reported_decreases: 1,
      previous_period: '2026-03-31', period_of_report: '2026-06-30', source_urls: ['https://www.sec.gov/example'] }] : [];
  });
  const [item] = await fetchWatchlistDetails(['ABC.US']);
  expect(item.price).toBe('—');
  expect(item.signalsCount).toBe(3);
  expect(item.lastSignal).toContain('bilans zmian +1');
  expect(item.lastSignal).toContain('Błąd odczytu kursu');
  expect(item.signalSourceUrls).toEqual(['https://www.sec.gov/example']);
});

it('suppresses current prices for halted listings', async () => {
  read.mockImplementation(async path => path.startsWith('companies') ? [{ ticker: 'ABC', listing_status: 'halted' }]
    : path.startsWith('prices_daily') ? [{ ticker: 'ABC', date: '2026-10-06', close_raw: 90, currency: 'USD', source_url: 'https://example.com/us' }] : []);
  const [item] = await fetchWatchlistDetails(['ABC.US']);
  expect(item.price).toBe('—');
  expect(item.sparkline).toEqual([]);
});

it('preserves explicit market identity and rejects ambiguous bare tickers', async () => {
  read.mockImplementation(async path => path.startsWith('gpw_fin') ? [{ ticker: 'ABC', name: 'GPW company' }]
    : path.startsWith('us_security_catalogue') ? [{ ticker: 'ABC', name: 'US company' }] : []);
  expect((await searchWatchlistCompanies('ABC')).map(row => row.ticker)).toEqual(['ABC.WA', 'ABC.US']);
  expect(await resolveWatchlistTicker('ABC')).toBeNull();
  expect((await resolveWatchlistTicker('ABC.US'))?.ticker).toBe('ABC.US');
  expect((await resolveWatchlistTicker('ABC.PL'))?.ticker).toBe('ABC.WA');
});

it('finds SEC catalogue securities without inventing 13F coverage', async () => {
  read.mockImplementation(async path => path.startsWith('us_security_catalogue')
    ? [{ ticker: 'NEW', name: 'New SEC registrant' }] : []);
  expect(await resolveWatchlistTicker('NEW.US')).toEqual({ ticker: 'NEW.US', name: 'New SEC registrant', market: 'USA' });
  expect(read.mock.calls.some(([path]) => path.startsWith('vw_sec13f_screener'))).toBe(false);
  const [item] = await fetchWatchlistDetails(['NEW.US']);
  expect(item.name).toBe('New SEC registrant');
  expect(item.signalsCount).toBeNull();
  expect(item.price).toBe('—');
});
