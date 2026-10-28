import { afterEach, expect, it, vi } from 'vitest';
import { supabase } from './supabase';
import { fetchWikiSources } from './wikiSourcesApi';

afterEach(() => vi.restoreAllMocks());

it('rejects missing owner or page before querying', async () => {
  const from = vi.spyOn(supabase, 'from');
  await expect(fetchWikiSources('', 'page')).rejects.toThrow();
  await expect(fetchWikiSources('owner', '')).rejects.toThrow();
  expect(from).not.toHaveBeenCalled();
});

it('scopes and orders the limited query, returns rows, and surfaces read failures', async () => {
  const row = { id: 'citation', source_table: 'vanguard_stream', source_id: 'entry', source_date: null, quote: 'Dowód', relevance: 0.9 };
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValueOnce({ data: [row], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
      .mockResolvedValueOnce({ data: null, error: null }),
  };
  const from = vi.spyOn(supabase, 'from').mockReturnValue(query as never);
  await expect(fetchWikiSources('owner', 'page')).resolves.toEqual([row]);
  expect(from).toHaveBeenCalledWith('vanguard_wiki_sources');
  expect(query.eq.mock.calls).toEqual([['user_id', 'owner'], ['page_id', 'page']]);
  expect(query.order.mock.calls).toEqual([
    ['relevance', { ascending: false }], ['source_date', { ascending: false, nullsFirst: false }],
  ]);
  expect(query.limit).toHaveBeenCalledWith(8);
  await expect(fetchWikiSources('owner', 'page')).rejects.toThrow('offline');
  await expect(fetchWikiSources('owner', 'empty')).resolves.toEqual([]);
});
