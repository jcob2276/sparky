import { useCallback, useEffect, useRef, useState } from 'react';
import type { TodoViewMode } from '../TodoHeader';

const VIEW_KEY = 'todo:view';
const VIEWS: TodoViewMode[] = ['lista', 'eisenhower', 'kanban'];
const MODAL_SELECTOR = '[role="dialog"], [aria-modal="true"], [role="menu"]';
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

function readStorage(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

/** True when a shortcut must not fire: typing in a field or an overlay is open. */
export function isShortcutBlocked(target: EventTarget | null): boolean {
  if (target instanceof Element && target.closest(EDITABLE_SELECTOR)) return true;
  return document.querySelector(MODAL_SELECTOR) !== null;
}

interface ShellKeyHandlers {
  onNewTask: () => void;
  onEscape: () => void;
}

/**
 * Persisted shell prefs (last view), pre-mount bookkeeping for the
 * alternative views, and the global 1/2/3 + Ctrl/Cmd+N shortcuts.
 * The keydown listener is subscribed once; it reads the latest handlers through a ref.
 */
export function useTodoShell(ready: boolean, handlers: ShellKeyHandlers) {
  const [todoView, setViewState] = useState<TodoViewMode>(() => {
    const saved = readStorage(VIEW_KEY);
    return VIEWS.find((v) => v === saved) ?? 'lista';
  });
  // Not persisted: the sidebar always starts expanded so sections are never hidden by a stale flag.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [visited, setVisited] = useState<ReadonlySet<TodoViewMode>>(() => new Set<TodoViewMode>(['lista', todoView]));

  useEffect(() => { writeStorage(VIEW_KEY, todoView); }, [todoView]);

  const setTodoView = useCallback((view: TodoViewMode) => {
    setViewState(view);
    setVisited((prev) => (prev.has(view) ? prev : new Set(prev).add(view)));
  }, []);

  // Pre-mount the other views while idle so switching is a pure show/hide (0 ms).
  useEffect(() => {
    if (!ready) return;
    const mountAll = () => setVisited(new Set(VIEWS));
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(mountAll, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(mountAll, 1200);
    return () => window.clearTimeout(id);
  }, [ready]);

  const latest = useRef(handlers);
  useEffect(() => { latest.current = handlers; });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'n') {
        if (isShortcutBlocked(e.target)) return;
        e.preventDefault();
        latest.current.onNewTask();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat) return;
      if (isShortcutBlocked(e.target)) return;
      if (e.key === 'Escape') latest.current.onEscape();
      else if (e.key === '1') setTodoView('lista');
      else if (e.key === '2') setTodoView('kanban');
      else if (e.key === '3') setTodoView('eisenhower');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setTodoView]);

  return { todoView, setTodoView, sidebarCollapsed, setSidebarCollapsed, visited };
}
