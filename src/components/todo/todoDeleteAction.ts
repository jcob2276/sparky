import { confirmDialog, dismissToast, notify } from '../../lib/notify';
import { deleteTodoItem, type TodoItemRow } from '../../lib/todo/todo';
import type { Dispatch, SetStateAction } from 'react';
import { playTodoExit } from './todoExitAnimation';

/** Shared by the card and its menu so deletion has one confirmation and rollback path. */
export async function confirmAndDeleteTodoItem(
  item: TodoItemRow,
  setItems: Dispatch<SetStateAction<TodoItemRow[]>>,
  setError: (message: string) => void,
  message = `Usunąć zadanie „${item.title}” na stałe?`,
) {
  if (!await confirmDialog(message)) return;
  await playTodoExit(item.id);
  setItems(previous => previous.filter(current => current.id !== item.id));
  try {
    await deleteTodoItem(item.id);
  } catch (error) {
    setItems(previous => previous.some(current => current.id === item.id) ? previous : [...previous, item]);
    setError(error instanceof Error ? error.message : String(error));
  }
}

/** How long a deleted task can still be brought back; the row is gone from the list straight away. */
const UNDO_WINDOW_MS = 5000;

/** Reminders-style delete: no question, the task leaves at once and a toast offers "Cofnij" until the database write happens. */
export async function deleteTodoItemWithUndo(
  item: TodoItemRow,
  setItems: Dispatch<SetStateAction<TodoItemRow[]>>,
  setError: (message: string) => void,
) {
  await playTodoExit(item.id);
  setItems(previous => previous.filter(current => current.id !== item.id));
  const restore = () => setItems(previous => previous.some(current => current.id === item.id) ? previous : [...previous, item]);
  let undone = false;
  let toastId = '';
  toastId = notify(`Usunięto „${item.title}”`, 'info', {
    duration: UNDO_WINDOW_MS,
    action: { label: 'Cofnij', onClick: () => { undone = true; restore(); dismissToast(toastId); } },
  });
  await new Promise(resolve => window.setTimeout(resolve, UNDO_WINDOW_MS));
  if (undone) return;
  try {
    await deleteTodoItem(item.id);
  } catch (error) {
    restore();
    setError(error instanceof Error ? error.message : String(error));
  }
}
