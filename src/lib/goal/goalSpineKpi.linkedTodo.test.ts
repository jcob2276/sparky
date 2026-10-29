import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
const task = vi.hoisted(() => ({ value: null as null | Record<string, unknown> }));
vi.mock('../supabase', () => ({
  supabase: {
    rpc,
    from: () => {
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'eq']) q[m] = () => q;
      q.maybeSingle = async () => ({ data: { id: 'k', projects: { name: 'Inny' } }, error: null });
      return q;
    },
  },
}));
vi.mock('../dailyWinTasksApi', () => ({ fetchTodayTaskKpiBinding: async () => task.value }));
vi.mock('./goalSpine.queries', () => ({
  invalidateGoalSpineCache: vi.fn(),
  fetchKpisForProject: vi.fn().mockResolvedValue([
    { id: 'duzy', target: 100 },
    { id: 'wybrany', target: 10 },
  ]),
}));

import { applyKpiRollupForLinkedTodo } from './goalSpineKpi.mutations';

describe('applyKpiRollupForLinkedTodo', () => {
  beforeEach(() => rpc.mockClear());

  it('uses the KPI stored on the task, the same as PowerList, not the largest target', async () => {
    task.value = { project_id: 'p1', target_value: '10', kpi_id: 'wybrany' };
    await applyKpiRollupForLinkedTodo('u1', 'todo-1', 1);
    expect(rpc).toHaveBeenCalledWith('increment_kpi_entry_for_week', expect.objectContaining({ p_kpi_id: 'wybrany', p_delta: 10 }));
  });

  it('reverses on the same KPI', async () => {
    task.value = { project_id: 'p1', target_value: '10', kpi_id: 'wybrany' };
    await applyKpiRollupForLinkedTodo('u1', 'todo-1', -1);
    expect(rpc).toHaveBeenCalledWith('increment_kpi_entry_for_week', expect.objectContaining({ p_kpi_id: 'wybrany', p_delta: -10 }));
  });

  it('does nothing when the task has no project or target', async () => {
    task.value = { project_id: null, target_value: null, kpi_id: null };
    await applyKpiRollupForLinkedTodo('u1', 'todo-1', 1);
    expect(rpc).not.toHaveBeenCalled();
  });
});
