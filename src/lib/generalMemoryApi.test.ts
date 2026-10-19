import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGeneralMemoryData } from './generalMemoryApi';
import { supabase } from './supabase';
import * as recommendations from './recommendationsApi';

afterEach(() => vi.restoreAllMocks());

describe('general memory data', () => {
  it('rejects requests without an owner before any query', async () => {
    const from = vi.spyOn(supabase, 'from').mockImplementation(() => { throw new Error('Unexpected unscoped request'); });
    await expect(fetchGeneralMemoryData('')).rejects.toThrow('Brak użytkownika');
    expect(from).not.toHaveBeenCalled();
  });

  it('makes wiki provenance available to the active consumer and surfaces failed wiki reads', async () => {
    vi.spyOn(recommendations, 'fetchOracleRecommendations').mockResolvedValue([]);
    const selected: Record<string, string> = {};
    const scopes: string[] = [];
    let wikiError: { message: string } | null = null;
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      const query = {
        select: (columns: string) => { selected[table] = columns; return query; },
        eq: (field: string, value: string) => { if (field === 'user_id') scopes.push(value); return query; },
        in: () => query,
        order: () => query,
        limit: async () => ({ data: table === 'vanguard_wiki_pages' ? [{ id: 'page-one', content_md: 'Pełna teza', source_refs: [{ table: 'vanguard_stream', id: 'source-one', quote: 'Źródłowe słowa' }] }] : [], error: table === 'vanguard_wiki_pages' ? wikiError : null }),
      };
      return query as never;
    });
    const data = await fetchGeneralMemoryData('owner');
    expect(data.wiki[0]).toMatchObject({ id: 'page-one', content_md: 'Pełna teza', source_refs: [{ id: 'source-one', quote: 'Źródłowe słowa' }] });
    expect(selected.vanguard_wiki_pages.split(', ')).toEqual(expect.arrayContaining(['id', 'content_md', 'source_refs', 'last_compiled_at']));
    expect(scopes).toEqual(['owner', 'owner', 'owner']);
    wikiError = { message: 'wiki offline' };
    await expect(fetchGeneralMemoryData('owner')).rejects.toThrow('wiki offline');
  });
});
