/** Keyboard -> row bridge: the list hook asks one row to open one of its popovers. */
export type TodoRowCommand = 'date' | 'priority' | 'move';

export const TODO_ROW_COMMAND_EVENT = 'todo:row-command';

export interface TodoRowCommandDetail {
  id: string;
  command: TodoRowCommand;
}

export function dispatchTodoRowCommand(id: string, command: TodoRowCommand) {
  window.dispatchEvent(new CustomEvent<TodoRowCommandDetail>(TODO_ROW_COMMAND_EVENT, { detail: { id, command } }));
}

export function readTodoRowCommand(event: Event): TodoRowCommandDetail | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail: unknown = event.detail;
  if (typeof detail !== 'object' || detail === null) return null;
  const { id, command } = detail as { id?: unknown; command?: unknown };
  if (typeof id !== 'string') return null;
  if (command !== 'date' && command !== 'priority' && command !== 'move') return null;
  return { id, command };
}

/** Focuses a task row once React has rendered it (rows remount when they change section). */
export function focusTodoRow(id: string | undefined) {
  if (!id) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const row = document.querySelector<HTMLElement>(`.todo-focus-grid [data-todo-id="${CSS.escape(id)}"]`);
    row?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: 'nearest' });
  }));
}
