import { useEffect } from 'react';
import { openTodoPalette } from '../todoPaletteNav';
export const TODO_QUICK_ADD_EVENT = 'todo:quick-add';

interface UseTodoKeyboardProps {
  setExpandedId: (id: string | null) => void;
  setContextMenu: (menu: null) => void;
}

const TODO_SEARCH_SELECTOR = 'input[data-todo-search]';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
    || target.isContentEditable
    || target.getAttribute('role') === 'textbox';
}

function isDialogOpen(): boolean {
  return Boolean(document.querySelector('[role="dialog"], [aria-modal="true"]'));
}

function focusSearch() {
  const input = document.querySelector<HTMLInputElement>(TODO_SEARCH_SELECTOR);
  if (!input) return;
  input.focus();
  input.select();
}

export function useTodoKeyboard({ setExpandedId, setContextMenu }: UseTodoKeyboardProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const typing = isTypingTarget(e.target);
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

      // Ctrl/Cmd+K opens the command palette everywhere (also from inputs), unless another
      // dialog owns the screen. The open palette handles its own Ctrl/Cmd+K (toggle).
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        if (isDialogOpen()) return;
        e.preventDefault();
        openTodoPalette();
        return;
      }

      if (e.key === 'Escape') {
        if (typing && e.target instanceof HTMLElement) e.target.blur();
        setExpandedId(null);
        setContextMenu(null);
        return;
      }

      // Single-key shortcuts must never steal typing, browser chords or dialog keys.
      if (typing || hasModifier || isDialogOpen()) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(TODO_QUICK_ADD_EVENT));
      } else if (e.key === '/') {
        e.preventDefault();
        focusSearch();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setExpandedId, setContextMenu]);
}
