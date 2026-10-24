import { describe, expect, it, vi } from 'vitest';
import { invalidateGoalSpineCache } from './goalSpine.queries';
import { queryClient } from '../queryClient';

vi.mock('../supabase', () => ({ supabase: {} }));

describe('invalidateGoalSpineCache', () => {
  it('odświeża też cele sprzedaży czytane z goal_kpis', () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    invalidateGoalSpineCache('u1');
    expect(spy.mock.calls.map(([filter]) => filter?.queryKey)).toContainEqual(['closer-targets', 'u1']);
    spy.mockRestore();
  });
});
