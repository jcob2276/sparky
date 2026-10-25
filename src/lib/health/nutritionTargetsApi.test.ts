import { describe, expect, it, vi } from 'vitest';

const calls: Array<[string, unknown[]]> = [];
vi.mock('../supabase', () => {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  for (const name of ['from', 'select', 'eq', 'lte', 'order', 'limit']) {
    chain[name] = (...args: unknown[]) => { calls.push([name, args]); return chain; };
  }
  chain.maybeSingle = async () => ({ data: { date: '2026-10-24', target_kcal: 2428, protein_floor_g: 155 }, error: null });
  return { supabase: chain };
});

import { fetchNutritionTargetForDay } from './nutritionTargetsApi';

describe('fetchNutritionTargetForDay', () => {
  it('nie bierze celu zapisanego z wyprzedzeniem na kolejne dni', async () => {
    const row = await fetchNutritionTargetForDay('u1', '2026-10-24');
    expect(calls).toContainEqual(['lte', ['date', '2026-10-24']]);
    expect(calls).toContainEqual(['order', ['date', { ascending: false }]]);
    expect(row?.target_kcal).toBe(2428);
  });
});
