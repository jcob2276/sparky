const EXIT_MS = 200;
/** Keyboard-initiated actions repeat constantly, so they skip the exit animation and feel instant. */
const KEYBOARD_WINDOW_MS = 400;
let lastKeydownAt = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', () => { lastKeydownAt = performance.now(); }, { capture: true, passive: true });
}

/** Plays the "task leaves the list" animation on a card; resolves once the card may be removed from state. */
export function playTodoExit(itemId: string): Promise<void> {
  if (typeof document === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || performance.now() - lastKeydownAt < KEYBOARD_WINDOW_MS) {
    return Promise.resolve();
  }
  const el = document.querySelector(`[data-todo-id="${CSS.escape(itemId)}"]`);
  if (!el) return Promise.resolve();
  el.classList.add('todo-card-leaving');
  return new Promise((resolve) => window.setTimeout(resolve, EXIT_MS));
}
