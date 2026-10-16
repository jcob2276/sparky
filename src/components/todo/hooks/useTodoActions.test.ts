import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTodoActions } from './useTodoActions';
import { createTodoItem, setTodoStatus } from '../../../lib/todo/todo';
import type { TodoItemRow } from '../useTodoData';

vi.mock('../../../lib/todo/todo', () => ({
  createTodoItem: vi.fn(),
  setTodoStatus: vi.fn(),
  updateTodoItem: vi.fn(),
}));

vi.mock('../../../lib/notify', () => ({
  notify: vi.fn(),
}));

vi.mock('../../../lib/actionHistory', () => ({
  registerReversibleAction: vi.fn(() => 'action-1'),
  undoAction: vi.fn(),
}));

describe('useTodoActions - Recurring tasks linkage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setTodoStatus).mockResolvedValue(undefined as never);
    vi.mocked(createTodoItem).mockResolvedValue({ id: 'new-todo-2' } as never);
  });

  it('preserves project_id, is_important, category, and duration_minutes when recurring task is completed', async () => {
    const recurringItem: TodoItemRow = {
      id: 'todo-1',
      user_id: 'user-1',
      title: 'Cotygodniowy przegląd projektu',
      notes: 'Ważne notatki',
      status: 'open',
      priority: 'high',
      tags: ['praca', 'sprint'],
      due_date: '2026-10-15',
      deadline_date: null,
      recurrence: 'weekly',
      recurrence_origin_id: null,
      scheduled_time: null,
      reminder_at: null,
      reminder_sent: false,
      section_id: 'sec-1',
      project_id: 'proj-42',
      category: 'deep-work',
      duration_minutes: 60,
      is_important: true,
      parent_task_id: null,
      is_milestone: false,
      sort_order: 1,
      ai_bucket: null,
      ai_classified_at: null,
      created_at: '2026-10-10T10:00:00Z',
      updated_at: '2026-10-10T10:00:00Z',
      completed_at: null,
    };

    const setItems = vi.fn();
    const setError = vi.fn();

    const { result } = renderHook(() =>
      useTodoActions({
        userId: 'user-1',
        today: '2026-10-15',
        items: [recurringItem],
        setItems,
        setError,
        run: async (fn) => { await fn(); },
        fetchAll: vi.fn(),
        editingTitle: '',
        setEditingId: vi.fn(),
        setEditingTitle: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleComplete(recurringItem);
    });

    expect(setTodoStatus).toHaveBeenCalledWith(recurringItem, 'done');
    expect(createTodoItem).toHaveBeenCalledWith('user-1', expect.objectContaining({
      title: 'Cotygodniowy przegląd projektu',
      due_date: '2026-10-22',
      recurrence: 'weekly',
      project_id: 'proj-42',
      is_important: true,
      category: 'deep-work',
      duration_minutes: 60,
    }));
  });
});
