import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import TodoCardCollapsedRow from './TodoCardCollapsedRow';
import type { TodoItemRow } from '../../lib/todo/todo';

afterEach(cleanup);
const props = (): ComponentProps<typeof TodoCardCollapsedRow> => ({
  item: { id: 'task', user_id: 'user', title: 'Test', status: 'done',
    priority: 'normal', tags: [], notes: null, ai_bucket: null, ai_classified_at: null,
    category: null, completed_at: null, created_at: '', updated_at: '',
    deadline_date: null, due_date: null, duration_minutes: null, is_important: false,
    is_milestone: false, parent_task_id: null, project_id: null, recurrence: null,
    recurrence_origin_id: null, reminder_at: null, reminder_sent: false,
    scheduled_time: null, section_id: null, sort_order: 0 } satisfies TodoItemRow,
  busy: false, isDone: true, icon: null, label: 'Test', dateInfo: null,
  today: '2026-10-08', isEditing: false, editingTitle: '', expanded: false,
  onEditChange: vi.fn(), onEditSave: vi.fn(), onTitlePress: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), panelId: 'details',
  totalSubtaskCount: 0, doneSubtaskCount: 0, isLinkedToPlan: false,
  swipe: { handleComplete: vi.fn(),
    onGripTouchStart: vi.fn(), onGripTouchEnd: vi.fn(), onGripTouchMove: vi.fn(), onGripMouseDown: vi.fn() },
  onShowContextMenu: vi.fn(),
});

describe('task row actions', () => {
  it('keeps the actions menu available for completed tasks', () => {
    const input = props();
    render(<TodoCardCollapsedRow {...input} />);
    fireEvent.click(screen.getByRole('button', { name: 'Więcej opcji' }));
    expect(input.onShowContextMenu).toHaveBeenCalledWith(input.item, expect.any(Number), expect.any(Number));
  });
  it('can reopen a completed task without expanding or dragging it', () => {
    const input = props();
    render(<TodoCardCollapsedRow {...input} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Oznacz jako niewykonane: Test' }));
    expect(input.swipe.handleComplete).toHaveBeenCalledOnce();
    expect(input.swipe.onGripMouseDown).not.toHaveBeenCalled();
  });
  it('exposes direct edit and delete actions even when completed', () => {
    const input = props();
    render(<TodoCardCollapsedRow {...input} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edytuj: Test' }));
    fireEvent.click(screen.getByRole('button', { name: 'Usuń: Test' }));
    expect(input.onEdit).toHaveBeenCalledOnce();
    expect(input.onDelete).toHaveBeenCalledOnce();
  });
});
