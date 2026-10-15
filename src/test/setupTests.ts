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

