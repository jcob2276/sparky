import { expect, it, vi } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import type { TodoItemRow } from '../../lib/todo/todo';
import { confirmDialog } from '../../lib/notify';
import { deleteTodoItem } from '../../lib/todo/todo';
import { confirmAndDeleteTodoItem } from './todoDeleteAction';

vi.mock('../../lib/notify', () => ({ confirmDialog: vi.fn() }));
vi.mock('../../lib/todo/todo', () => ({ deleteTodoItem: vi.fn() }));

it('keeps the task when deletion is cancelled', async () => {
  const item = { id: 'one', title: 'Test' } as TodoItemRow;
  let items = [item];
  const setItems: Dispatch<SetStateAction<TodoItemRow[]>> = update => {
    items = typeof update === 'function' ? update(items) : update;
  };
  vi.mocked(confirmDialog).mockResolvedValueOnce(false);
  await confirmAndDeleteTodoItem(item, setItems, vi.fn());
  expect(items).toEqual([item]);
  expect(deleteTodoItem).not.toHaveBeenCalled();
});

it('restores the task and reports the error when deletion fails', async () => {
  const item = { id: 'one', title: 'Test' } as TodoItemRow;
  let items = [item];
  const setItems: Dispatch<SetStateAction<TodoItemRow[]>> = update => {
    items = typeof update === 'function' ? update(items) : update;
  };
  const setError = vi.fn();
  vi.mocked(confirmDialog).mockResolvedValueOnce(true);
  vi.mocked(deleteTodoItem).mockRejectedValueOnce(new Error('Połączenie przerwane'));
  await confirmAndDeleteTodoItem(item, setItems, setError);
  expect(items).toEqual([item]);
  expect(setError).toHaveBeenCalledWith('Połączenie przerwane');
});
