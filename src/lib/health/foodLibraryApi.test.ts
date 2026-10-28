import { beforeEach, expect, it, vi } from 'vitest';
import { cacheFoodToLibrary, upsertCustomFood, searchPrivateFoodLibrary } from './foodLibraryApi';

const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('../supabase', () => ({ supabase: { rpc, from }, invokeEdge: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

it('reuses the insert-only catalog result for a custom product instead of overwriting its macros', async () => {
  const eq = vi.fn();
  const stored = { name: 'Chleb', brand: 'Stara', barcode: null, calories: 250,
    protein: 8, carbs: 48, fat: 2, fiber: 6, sugar: 3, saturated_fat: 0.5,
    salt: 1.2, nutrient_sources: { salt: 'data' }, default_grams: 80 };
  const query = { select: () => query, eq, single: async () => ({ data: stored, error: null }) };
  eq.mockReturnValue(query); from.mockReturnValue(query);
  rpc.mockResolvedValue({ data: 'library', error: null });
  expect(await upsertCustomFood('owner', { name: ' chleb ', calories: 999, protein: 99 }))
    .toEqual({ ...stored, default_grams: undefined, library_id: 'library', defaultGrams: 80, source: 'confirmed' });
  expect(rpc).toHaveBeenCalledWith('ensure_food_library', expect.objectContaining({ p_user_id: 'owner' }));
  expect(eq.mock.calls).toEqual([['user_id', 'owner'], ['id', 'library']]);
});

it('caches provenance through the same insert-only catalog function', async () => {
  rpc.mockResolvedValue({ data: 'lib', error: null });
  await cacheFoodToLibrary('owner', { name: 'Chleb', brand: null, barcode: '123',
    calories: 250, protein: 8, carbs: 48, fat: 2, fiber: 6, sugar: 3,
    salt: 1.2, nutrient_sources: { salt: 'data' } }, 80);
  expect(from).not.toHaveBeenCalled();
  expect(rpc).toHaveBeenCalledWith('ensure_food_library', expect.objectContaining({
    p_user_id: 'owner', p_default_grams: 80,
    p_food: expect.objectContaining({ barcode: '123', salt: 1.2, nutrient_sources: expect.objectContaining({ salt: 'data' }) }),
  }));
});

it('searches the catalog with its identity and quarantine filter', async () => {
  const neq = vi.fn(), eq = vi.fn();
  const query = { select: () => query, eq, neq, order: () => query,
    range: async () => ({ data: [{ id: 'lib', name: 'Chleb', default_grams: 80, salt: 1.2, nutrient_sources: {} }], error: null }) };
  eq.mockReturnValue(query); neq.mockReturnValue(query); from.mockReturnValue(query);
  expect(await searchPrivateFoodLibrary('owner', 'chleb')).toEqual([
    { library_id: 'lib', name: 'Chleb', defaultGrams: 80, salt: 1.2, nutrient_sources: {}, source: 'confirmed' },
  ]);
  expect(eq).toHaveBeenCalledWith('user_id', 'owner');
  expect(neq).toHaveBeenCalledWith('validation_status', 'quarantined');
});
