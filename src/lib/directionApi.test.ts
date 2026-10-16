import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDirectionWeekBoard } from './directionApi';

const source = vi.hoisted(() => ({ failedTable: null as string | null }));
vi.mock('./supabase', () => ({ supabase: { from: (table: string) => ({
  select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(),
  then: (resolve: (value: { data: unknown[]; error: { message: string } | null }) => unknown) =>
    Promise.resolve({ data: [], error: source.failedTable === table ? { message: `${table} offline` } : null }).then(resolve),
}) } }));
afterEach(() => { source.failedTable = null; });
describe('direction board read contract', () => {
  it('propagates a failed board source instead of treating it as an empty plan', async () => {
    source.failedTable = 'goal_kpis';
    await expect(fetchDirectionWeekBoard('owner', '2026-10-12', '2026-10-19', '2026-10-11T22:00:00Z')).rejects.toMatchObject({ message: 'goal_kpis offline' });
  });
  it('accepts genuinely empty results after every source read succeeds', async () => {
    const rows = await fetchDirectionWeekBoard('owner', '2026-10-12', '2026-10-19', '2026-10-11T22:00:00Z');
    expect(rows).toHaveLength(10);
    expect(rows.every((row) => row.error == null)).toBe(true);
  });
});
