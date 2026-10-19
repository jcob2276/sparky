import type { TodoViewMode } from './TodoHeader';

/** Window events the command palette speaks. Listeners live in the owning components. */
export const TODO_PALETTE_EVENT = 'todo:open-palette';
export const TODO_NAVIGATE_EVENT = 'todo:navigate';
const TODO_TOGGLE_CALENDAR_EVENT = 'todo:toggle-calendar';

export type TodoNavTarget = 'inbox' | 'today' | 'upcoming' | 'all' | 'flagged' | 'completed';

export interface TodoNavigateDetail {
  target: TodoNavTarget;
  /** A listener that performs the navigation sets this to true. */
  handled?: boolean;
}

const VIEW_KEYS: Record<TodoViewMode, string> = { lista: '1', kanban: '2', eisenhower: '3' };

/** Grid cards (always rendered in the list view) carry `aria-label="<title>: N zadań"`. */
const GRID_TITLES: Partial<Record<TodoNavTarget, string>> = {
  today: 'Dzisiaj', upcoming: 'Zaplanowane', all: 'Wszystkie', flagged: 'Z flagą', completed: 'Ukończone',
};
const SIDEBAR_LABELS: Partial<Record<TodoNavTarget, string>> = {
  inbox: 'Skrzynka', today: 'Dziś', upcoming: 'Nadchodzące',
};

export function openTodoPalette(initialQuery = '') {
  window.dispatchEvent(new CustomEvent(TODO_PALETTE_EVENT, { detail: { query: initialQuery } }));
}

export function toggleTodoCalendar() {
  window.dispatchEvent(new CustomEvent(TODO_TOGGLE_CALENDAR_EVENT));
}

/**
 * Switches the board view through the shell's 1/2/3 shortcuts (the view state lives in
 * `useTodoShell`). Must run after the palette dialog unmounted, otherwise the shell
 * treats the open dialog as a blocking overlay.
 */
export function switchTodoView(view: TodoViewMode) {
  window.setTimeout(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: VIEW_KEYS[view], bubbles: true }));
  }, 0);
}

function clickByLabel(selector: string, matches: (label: string) => boolean): boolean {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const label = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
    if (matches(label)) { el.click(); return true; }
  }
  return false;
}

/**
 * Navigates the list view. Fires `todo:navigate` first (an owner may handle it);
 * otherwise falls back to clicking the matching smart-list card / sidebar entry.
 */
export function navigateTodo(target: TodoNavTarget) {
  const detail: TodoNavigateDetail = { target };
  window.dispatchEvent(new CustomEvent<TodoNavigateDetail>(TODO_NAVIGATE_EVENT, { detail }));
  if (detail.handled) return;
  const gridTitle = GRID_TITLES[target];
  if (gridTitle && clickByLabel('button[aria-label]', (l) => l.startsWith(`${gridTitle}:`))) return;
  const sidebarLabel = SIDEBAR_LABELS[target];
  if (sidebarLabel) clickByLabel('[data-sidebar] button, aside button', (l) => l.startsWith(sidebarLabel));
}

/** Selects a section through its sidebar entry (the nav destination lives in Todo.tsx). */
export function navigateToSectionEntry(sectionName: string) {
  clickByLabel('[data-sidebar] button, aside button', (l) => l === sectionName || l.startsWith(`${sectionName}\n`));
}

/**
 * Jumps to a task and expands it. If the task is not rendered in the current smart list,
 * falls back to "Wszystkie"/"Ukończone" (card clicks bubble into a handler that collapses
 * the expanded card, hence the second `setExpanded`).
 */
export function revealTodo(taskId: string, isDone: boolean, setExpanded: (id: string | null) => void) {
  const find = () => document.querySelector<HTMLElement>(`[data-todo-id="${CSS.escape(taskId)}"]`);
  const scroll = () => find()?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => {
    if (find()?.getClientRects().length) { scroll(); return; }
    navigateTodo(isDone ? 'completed' : 'all');
    window.setTimeout(() => { setExpanded(taskId); window.setTimeout(scroll, 60); }, 60);
  }, 120);
}
