import { createElement, type PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shutdownKeys, todoKeys } from '../../../lib/queryKeys';
import { useShutdownData } from './useShutdownData';

const m = vi.hoisted(() => ({
  updateSlot: vi.fn(), updateDay: vi.fn(), score: vi.fn(), stream: vi.fn(),
}));
vi.mock('../../../store/useStore', () => ({ useUserId: () => 'owner' }));
vi.mock('../../../lib/date', () => ({ getTodayWarsaw: () => '2026-10-28' }));
vi.mock('../../../lib/notify', () => ({ notify: vi.fn() }));
vi.mock('../../../lib/dailyWinTasksApi', () => ({ updateDailyWinTaskBySlot: m.updateSlot }));
vi.mock('../../../lib/goal/goalSpine.mutations', () => ({ updateDailyWin: m.updateDay }));
vi.mock('../../../lib/shutdownApi', () => ({
  fetchDailyWin: vi.fn(), fetchDailyReconciliationScore: vi.fn(),
  upsertDailyReconciliationScore: m.score, insertSparkyStream: m.stream,
}));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(shutdownKeys.data('owner', '2026-10-28'), {
    dayScore: 8,
    todayWin: { id: 'day', day_note: '', mood_score: 4, task_1: 'ghost', done_1: true,
      daily_win_tasks: [
        { slot: 5, title: 'Call', todo_id: 'todo', done: false, completed_at: null },
        { slot: 2, title: 'Run', todo_id: null, done: true, completed_at: 'old' },
      ] },
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: PropsWithChildren) => createElement(QueryClientProvider, { client }, children);
  return { ...renderHook(() => useShutdownData(), { wrapper }), invalidate };
}

beforeEach(() => { vi.clearAllMocks(); m.updateSlot.mockResolvedValue(undefined); });

describe('shutdown normalized tasks', () => {
  it('loads sparse slots and saves completion by slot without changing an earlier timestamp', async () => {
    const { result, invalidate } = setup();
    expect(result.current.completedTasks).toEqual([false, true, false, false, false]);
    expect(result.current.tasksList).toEqual([
      { idx: 1, title: 'Run', todoId: null, done: true },
      { idx: 4, title: 'Call', todoId: 'todo', done: false },
    ]);
    act(() => result.current.setCompletedTasks([false, true, false, false, true]));
    await act(async () => { expect(await result.current.handleSaveShutdown()).toBe(true); });
    expect(m.updateSlot).toHaveBeenCalledExactlyOnceWith('owner', 'day', 5, true, expect.any(String));
    expect(m.updateDay).toHaveBeenCalledWith('owner', 'day', { day_note: '', mood_score: 4, result: 'Z' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: shutdownKeys.data('owner', '2026-10-28') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: todoKeys.dailyWins('owner', '2026-10-28') });
  });

  it('clears completion time when unchecked and stops closing the day on a failed task write', async () => {
    const { result } = setup();
    act(() => result.current.setCompletedTasks([false, false, false, false, false]));
    m.updateSlot.mockRejectedValueOnce(new Error('denied'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => { expect(await result.current.handleSaveShutdown()).toBe(false); });
    await waitFor(() => expect(result.current.saving).toBe(false));
    expect(m.updateSlot).toHaveBeenCalledWith('owner', 'day', 2, false, null);
    expect(m.updateDay).not.toHaveBeenCalled();
    expect(m.stream).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
