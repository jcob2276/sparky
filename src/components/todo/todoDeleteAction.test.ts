import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import type { TodoItemRow } from '../../lib/todo/todo';
import { confirmDialog, dismissToast, notify } from '../../lib/notify';
import { deleteTodoItem } from '../../lib/todo/todo';
import { confirmAndDeleteTodoItem, deleteTodoItemWithUndo } from './todoDeleteAction';

vi.mock('../../lib/notify', () => ({ confirmDialog: vi.fn(), notify: vi.fn(() => 'toast'), dismissToast: vi.fn() }));
vi.mock('../../lib/todo/todo', () => ({ deleteTodoItem: vi.fn() }));

const makeState = (item: TodoItemRow) => {
  let items = [item];
  const setItems: Dispatch<SetStateAction<TodoItemRow[]>> = update => {
    items = typeof update === 'function' ? update(items) : update;
  };
  return { setItems, get: () => items };
};

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.useRealTimers(); });

it('keeps the task when deletion is cancelled', async () => {
  const item = { id: 'one', title: 'Test' } as TodoItemRow;
  const state = makeState(item);
  vi.mocked(confirmDialog).mockResolvedValueOnce(false);
  await confirmAndDeleteTodoItem(item, state.setItems, vi.fn());
  expect(state.get()).toEqual([item]);
  expect(deleteTodoItem).not.toHaveBeenCalled();
});

it('restores the task and reports the error when deletion fails', async () => {
  const item = { id: 'one', title: 'Test' } as TodoItemRow;
  const state = makeState(item);
  const setError = vi.fn();
  vi.mocked(confirmDialog).mockResolvedValueOnce(true);
  vi.mocked(deleteTodoItem).mockRejectedValueOnce(new Error('Połączenie przerwane'));
  await confirmAndDeleteTodoItem(item, state.setItems, setError);
  expect(state.get()).toEqual([item]);
  expect(setError).toHaveBeenCalledWith('Połączenie przerwane');
});

it('removes the task at once and writes to the database only after the undo window', async () => {
  vi.useFakeTimers();
  const item = { id: 'one', title: 'Test' } as TodoItemRow;
  const state = makeState(item);
  const pending = deleteTodoItemWithUndo(item, state.setItems, vi.fn());
  await vi.advanceTimersByTimeAsync(10);
  expect(state.get()).toEqual([]);
  expect(deleteTodoItem).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(5000);
  await pending;
  expect(deleteTodoItem).toHaveBeenCalledWith('one');
});

it('brings the task back and skips the database write when "Cofnij" is pressed', async () => {
  vi.useFakeTimers();
  const item = { id: 'one', title: 'Test' } as TodoItemRow;
  const state = makeState(item);
  const pending = deleteTodoItemWithUndo(item, state.setItems, vi.fn());
  await vi.advanceTimersByTimeAsync(10);
  const options = vi.mocked(notify).mock.calls[0][2];
  options?.action?.onClick();
  expect(state.get()).toEqual([item]);
  expect(dismissToast).toHaveBeenCalledWith('toast');
  await vi.advanceTimersByTimeAsync(5000);
  await pending;
  expect(deleteTodoItem).not.toHaveBeenCalled();
});
