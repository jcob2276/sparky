import { beforeEach, expect, it, vi } from 'vitest';
import { fetchFavorites } from './foodEntryListsApi';

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../supabase', () => ({ supabase: { from } }));
beforeEach(() => vi.clearAllMocks());

it('reads favorite product fields only from the owned catalog, keeping usage on the favorite', async () => {
  const select = vi.fn(), eq = vi.fn(), neq = vi.fn();
  const product = { name: 'Katalog', calories: 250, salt: 1.2, nutrient_sources: { salt: 'data' } };
  const query = {
    select, eq, neq, order: () => query,
    limit: async () => ({ data: [{ id: 'fav', library_id: 'lib', use_count: 4, default_grams: 80, food_library: product }], error: null }),
  };
  select.mockReturnValue(query); eq.mockReturnValue(query); neq.mockReturnValue(query); from.mockReturnValue(query);
  expect(await fetchFavorites('owner')).toEqual([{ ...product, id: 'fav', library_id: 'lib', use_count: 4, default_grams: 80 }]);
  expect(select.mock.calls[0][0].split('food_library!inner(')[0]).toBe('id,library_id,use_count,last_used,is_pinned,default_grams,');
  expect(eq.mock.calls).toEqual([['user_id', 'owner'], ['food_library.user_id', 'owner']]);
  expect(neq).toHaveBeenCalledWith('food_library.validation_status', 'quarantined');
});

it('reports database failure instead of treating an unavailable library as an empty list', async () => {
  const query = { select: () => query, eq: () => query, neq: () => query, order: () => query,
    limit: async () => ({ data: null, error: new Error('offline') }) };
  from.mockReturnValue(query);
  await expect(fetchFavorites('owner')).rejects.toThrow('offline');
});
