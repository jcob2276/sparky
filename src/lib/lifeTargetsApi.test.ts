import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { invalidateLifeTargets } from './lifeTargetsApi';

vi.mock('./supabase', () => ({ supabase: {} }));

describe('invalidateLifeTargets', () => {
  it('odświeża cele i wszystko, co je pokazuje', () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    invalidateLifeTargets(queryClient, 'u1');
    expect(spy.mock.calls.map(([filter]) => filter?.queryKey)).toEqual([
      ['life-targets', 'u1'],
      ['body-fat-goal', 'u1'],
      ['bench-goal', 'u1'],
      ['chronicle'],
    ]);
  });
});
