import { confirmDialog } from '../../lib/notify';
import { deleteTodoItem, type TodoItemRow } from '../../lib/todo/todo';
import type { Dispatch, SetStateAction } from 'react';

/** Shared by the card and its menu so deletion has one confirmation and rollback path. */
export async function confirmAndDeleteTodoItem(
  item: TodoItemRow,
  setItems: Dispatch<SetStateAction<TodoItemRow[]>>,
  setError: (message: string) => void,
) {
  if (!await confirmDialog(`Usunąć zadanie „${item.title}” na stałe?`)) return;
  setItems(previous => previous.filter(current => current.id !== item.id));
  try {
    await deleteTodoItem(item.id);
  } catch (error) {
    setItems(previous => previous.some(current => current.id === item.id) ? previous : [...previous, item]);
    setError(error instanceof Error ? error.message : String(error));
  }
}
