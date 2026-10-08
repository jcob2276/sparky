import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTodoCardSwipe } from './useTodoCardSwipe';
import type { TodoItemRow } from '../../lib/todo/todo';

describe('task completion', () => {
  it('calls the action immediately when the checkbox is clicked', () => {
    const onToggle = vi.fn();
    const { result } = renderHook(() => useTodoCardSwipe({
      item: { id: 'task', title: 'Test' } as TodoItemRow,
      onToggle,
    }));
    act(() => result.current.handleComplete());
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
