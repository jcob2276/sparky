import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';
import type { TodoItemRow } from '../../../lib/todo/todo';
import TodoPicker from './TodoPicker';

function todo(id: string, title: string, dueDate: string | null): TodoItemRow {
  return {
    id,
    user_id: 'user-1',
    title,
    due_date: dueDate,
    status: 'open',
    priority: 'normal',
    category: null,
  } as TodoItemRow;
}

describe('TodoPicker', () => {
  it('separates today, overdue, undated and later tasks', () => {
    const today = getTodayWarsaw();
    render(
      <TodoPicker
        items={[
          todo('today', 'Na dziś', today),
          todo('overdue', 'Zaległe', shiftDateStr(today, -1)),
          todo('undated', 'Bez terminu', null),
          todo('later', 'Na później', shiftDateStr(today, 1)),
        ]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Dzisiaj' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Zaległe' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bez daty' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Później' })).toBeInTheDocument();
  });

  it('links the chosen Todo without changing its date', () => {
    const item = todo('today', 'Na dziś', getTodayWarsaw());
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<TodoPicker items={[item]} onSelect={onSelect} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /Na dziś/ }));

    expect(onSelect).toHaveBeenCalledWith(item);
    expect(onClose).toHaveBeenCalledOnce();
    expect(item.due_date).toBe(getTodayWarsaw());
  });
});
