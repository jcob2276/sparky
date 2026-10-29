import { beforeEach, describe, expect, it, vi } from 'vitest';

const applyKpi = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../goal/goalSpineKpi.mutations', () => ({ applyKpiRollupForLinkedTodo: applyKpi }));

// Wspólny stan "bazy": UPDATE ... WHERE status <> 'done' jest atomowy (jak w Postgresie), więc zmienia status tylko raz.
const row = vi.hoisted(() => ({ value: { id: 't1', user_id: 'u1', status: 'open' as string } }));
vi.mock('../supabase', () => ({
  supabase: {
    from: () => {
      let patch: Record<string, unknown> = {};
      let guard: ((r: typeof row.value) => boolean) | null = null;
      const q = {
        update: (p: Record<string, unknown>) => { patch = p; return q; },
        eq: (col: string, val: string) => { if (col === 'status') { const prev = guard; guard = (r) => (prev?.(r) ?? true) && r.status === val; } return q; },
        neq: (col: string, val: string) => { if (col === 'status') { const prev = guard; guard = (r) => (prev?.(r) ?? true) && r.status !== val; } return q; },
        select: () => q,
        single: async () => { row.value = { ...row.value, ...(patch as { status: string }) }; return { data: { ...row.value }, error: null }; },
        maybeSingle: async () => {
          if (guard && !guard(row.value)) return { data: null, error: null };
          row.value = { ...row.value, ...(patch as { status: string }) };
          return { data: { ...row.value }, error: null };
        },
      };
      return q;
    },
  },
}));

import { setTodoStatus } from './todo';

describe('setTodoStatus KPI contribution', () => {
  beforeEach(() => { applyKpi.mockClear(); row.value = { id: 't1', user_id: 'u1', status: 'open' }; });

  it('counts a parallel double check-off once', async () => {
    await Promise.all([setTodoStatus({ id: 't1' }, 'done'), setTodoStatus({ id: 't1' }, 'done')]);
    await vi.waitFor(() => expect(applyKpi).toHaveBeenCalled());
    expect(applyKpi).toHaveBeenCalledTimes(1);
    expect(applyKpi).toHaveBeenCalledWith('u1', 't1', 1);
  });

  it('reverses once when leaving done and not at all when it was never done', async () => {
    await setTodoStatus({ id: 't1' }, 'done');
    await Promise.all([setTodoStatus({ id: 't1' }, 'open'), setTodoStatus({ id: 't1' }, 'open')]);
    await vi.waitFor(() => expect(applyKpi).toHaveBeenCalledTimes(2));
    expect(applyKpi.mock.calls.map((c) => c[2])).toEqual([1, -1]);
    applyKpi.mockClear();
    await setTodoStatus({ id: 't1' }, 'in_progress');
    expect(applyKpi).not.toHaveBeenCalled();
    expect(row.value.status).toBe('in_progress');
  });
});
