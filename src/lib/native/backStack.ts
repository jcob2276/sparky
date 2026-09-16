import { useEffect, useRef } from 'react';

export type BackHandler = () => boolean | void;

const backHandlers: BackHandler[] = [];

/**
 * Registers a back-button handler. Handlers are evaluated LIFO (most recently registered first).
 * Returning `false` from a handler means "not handled, pass to next handler in stack".
 * Returning `true` or `void` means the back action was consumed.
 * Returns an unregister function.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler);
  return () => {
    const idx = backHandlers.lastIndexOf(handler);
    if (idx !== -1) {
      backHandlers.splice(idx, 1);
    }
  };
}

/**
 * Executes the topmost back handler.
 * Returns true if handled, false if the stack was empty or no handler consumed the event.
 */
export function handleNativeBack(): boolean {
  for (let i = backHandlers.length - 1; i >= 0; i--) {
    const handler = backHandlers[i];
    const handled = handler();
    if (handled !== false) {
      return true;
    }
  }
  return false;
}

/**
 * React hook to register a back-button handler when `active` is true.
 * Automatically cleans up on unmount or when `active` becomes false.
 */
export function useBackHandler(handler: BackHandler, active: boolean = true): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!active) return;
    return registerBackHandler(() => handlerRef.current());
  }, [active]);
}
