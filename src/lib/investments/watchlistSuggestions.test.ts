import { beforeEach, expect, it, vi } from 'vitest';
import { fetchWatchlistSuggestions } from './watchlistSearch';
import { orcaSelect } from './superinvestorsApi';
vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));
const read = vi.mocked(orcaSelect);
beforeEach(() => { read.mockReset().mockResolvedValue([]); });
it('does not invent suggestions on an empty read', async () => {
  expect(await fetchWatchlistSuggestions()).toEqual([]);
});
it('excludes halted listings and preserves verified ordering', async () => {
  read.mockImplementation(async path => path.startsWith('companies?')
    ? [{ ticker: 'OLD', listing_status: 'halted' }]
    : [{ ticker: 'OLD', company_name: 'Old' }, { ticker: 'ABC', company_name: 'Actual' }]);
  expect(await fetchWatchlistSuggestions()).toEqual([{ ticker: 'ABC', name: 'Actual', market: 'USA' }]);
  const query = read.mock.calls.find(([path]) => path.startsWith('vw_sec13f_screener?'))?.[0];
  expect(query).toContain('compared_funds=gt.0');
  expect(query).toContain('net_changes=gt.0');
});
it('propagates source errors instead of replacing them with defaults', async () => {
  read.mockRejectedValue(new Error('503'));
  await expect(fetchWatchlistSuggestions()).rejects.toThrow('503');
});
