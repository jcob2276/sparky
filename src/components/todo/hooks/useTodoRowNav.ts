import { useEffect, useRef, type RefObject } from 'react';
import { useTodoContext } from '../context/TodoContext';
import { confirmAndDeleteTodoItem } from '../todoDeleteAction';
import { playTodoExit } from '../todoExitAnimation';
import { dispatchTodoRowCommand, focusTodoRow } from '../todoRowCommands';
import { isShortcutBlocked } from './useTodoShell';

const ROW_SELECTOR = '.todo-focus-grid [data-todo-id]';
const INTERACTIVE = 'button, a, summary, [role="checkbox"], [role="button"]';

function visibleRows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(ROW_SELECTOR)).filter((el) => el.offsetParent !== null);
}

function focusRow(row: HTMLElement | null | undefined) {
  if (!row) return;
  row.focus({ preventScroll: true });
  row.scrollIntoView({ block: 'nearest' });
}

/**
 * Keyboard navigation over the visible task rows: j/k or arrows move, x / space complete,
 * e edit, d date, p priority, m move, Delete remove, Enter expand, ? shows the cheat sheet.
 * Never fires while typing or while a dialog/popover is open (isShortcutBlocked).
 */
export function useTodoRowNav(rootRef: RefObject<HTMLElement | null>, onHelp: () => void) {
  const { items, handleComplete, toggleExpand, setEditingId, setEditingTitle, setItems, setError } = useTodoContext();
  const latest = useRef({ items, handleComplete, toggleExpand, setEditingId, setEditingTitle, setItems, setError, onHelp });
  useEffect(() => {
    latest.current = { items, handleComplete, toggleExpand, setEditingId, setEditingTitle, setItems, setError, onHelp };
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      const root = rootRef.current;
      if (!root || root.offsetParent === null) return;
      if (isShortcutBlocked(e.target)) return;
      const key = e.key;
      if (key === '?') { e.preventDefault(); latest.current.onHelp(); return; }
      if (e.shiftKey) return;

      const rows = visibleRows();
      if (rows.length === 0) return;
      const active = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>('[data-todo-id]') : null;
      const index = active ? rows.indexOf(active) : -1;
      const onButton = e.target instanceof Element && e.target.closest(INTERACTIVE) !== null;

      const step = (delta: number) => {
        e.preventDefault();
        const next = index === -1 ? (delta > 0 ? 0 : rows.length - 1) : Math.min(rows.length - 1, Math.max(0, index + delta));
        focusRow(rows[next]);
      };
      if (key === 'j') return step(1);
      if (key === 'k') return step(-1);
      if (index === -1) return;
      if (key === 'ArrowDown') return step(1);
      if (key === 'ArrowUp') return step(-1);

      const row = rows[index];
      const id = row.dataset.todoId;
      const item = latest.current.items.find((candidate) => candidate.id === id);
      if (!id || !item) return;
      const neighbour = rows[index + 1] ?? rows[index - 1];
      const run = (action: () => void) => { e.preventDefault(); action(); };

      if (key === 'x' || (key === ' ' && !onButton)) {
        run(() => {
          const complete = () => { latest.current.handleComplete(item); focusTodoRow(neighbour?.dataset.todoId ?? id); };
          if (item.status === 'done') complete();
          else void playTodoExit(id).then(complete);
        });
      } else if (key === 'Enter' && !onButton) {
        run(() => latest.current.toggleExpand(id));
      } else if (key === 'e') {
        run(() => { latest.current.setEditingId(id); latest.current.setEditingTitle(item.title); });
      } else if (key === 'd') run(() => dispatchTodoRowCommand(id, 'date'));
      else if (key === 'p') run(() => dispatchTodoRowCommand(id, 'priority'));
      else if (key === 'm') run(() => dispatchTodoRowCommand(id, 'move'));
      else if (key === 'Delete') {
        run(() => {
          void confirmAndDeleteTodoItem(item, latest.current.setItems, latest.current.setError)
            .then(() => focusTodoRow(document.querySelector(`[data-todo-id="${CSS.escape(id)}"]`) ? id : neighbour?.dataset.todoId));
        });
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [rootRef]);
}
