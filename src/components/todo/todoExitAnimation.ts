const EXIT_MS = 240;

/** Plays the "task leaves the list" animation on a card; resolves once the card may be removed from state. */
export function playTodoExit(itemId: string): Promise<void> {
  if (typeof document === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return Promise.resolve();
  }
  const el = document.querySelector(`[data-todo-id="${CSS.escape(itemId)}"]`);
  if (!el) return Promise.resolve();
  el.classList.add('todo-card-leaving');
  return new Promise((resolve) => window.setTimeout(resolve, EXIT_MS));
}
