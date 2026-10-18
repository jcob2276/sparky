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
  onEditChange: vi.fn(), onEditSave: vi.fn(), onTitlePress: vi.fn(), onToggleExpand: vi.fn(), onDelete: vi.fn(), panelId: 'details',
  sections: [], onSetSchedule: vi.fn(), onSetPriority: vi.fn(), onMoveSection: vi.fn(),
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
  it('exposes direct delete and expand actions even when completed', () => {
    const input = props();
    render(<TodoCardCollapsedRow {...input} />);
    fireEvent.click(screen.getByRole('button', { name: 'Usuń: Test' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rozwiń szczegóły: Test' }));
    expect(input.onDelete).toHaveBeenCalledOnce();
    expect(input.onToggleExpand).toHaveBeenCalledOnce();
  });
  it('starts inline editing on title click without expanding', () => {
    const input = props();
    render(<TodoCardCollapsedRow {...input} />);
    fireEvent.click(screen.getByText('Test'));
    expect(input.onTitlePress).toHaveBeenCalledOnce();
    expect(input.onToggleExpand).not.toHaveBeenCalled();
  });
  it('saves on Enter, cancels on Escape and never saves twice on the following blur', () => {
    const save = vi.fn();
    const cancel = vi.fn();
    const input = { ...props(), isEditing: true, editingTitle: 'Nowy', onEditSave: save, onEditCancel: cancel };
    render(<TodoCardCollapsedRow {...input} />);
    const field = screen.getByRole('textbox');
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.blur(field);
    expect(save).toHaveBeenCalledOnce();
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('opens the date presets popover with a single click', () => {
    render(<TodoCardCollapsedRow {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ustaw termin: Test' }));
    expect(screen.getByRole('dialog', { name: 'Termin' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Za tydzień/ })).toBeTruthy();
  });
});
