import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// happy-dom rejects animation.finished on Animation.prototype.cancel() with AbortError.
// When motion-dom cancels animations during unmount/cleanup without attaching a rejection handler,
// Node reports an unhandled rejection. We attach a noop catch handler to prevent false test failures.
if (typeof window !== 'undefined' && typeof window.Animation !== 'undefined') {
  const originalCancel = window.Animation.prototype.cancel;
  window.Animation.prototype.cancel = function (this: Animation) {
    if (this.finished && typeof this.finished.catch === 'function') {
      this.finished.catch(() => {});
    }
    return originalCancel.call(this);
  };
}


// Node 26 exposes a `localStorage` global that is undefined without --localstorage-file and shadows happy-dom's.
// Install a minimal in-memory Storage so code under test (and tests that clear it) behave as in a browser.
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map<string, string>();
  const memory: Storage = {
    get length() { return store.size; },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => { store.delete(key); },
    setItem: (key, value) => { store.set(key, String(value)); },
  };
  Object.defineProperty(window, 'localStorage', { value: memory, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: memory, configurable: true, writable: true });
}
