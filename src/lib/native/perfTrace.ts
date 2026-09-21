/**
 * @file perfTrace.ts
 * @role Zero-overhead Performance & Perfetto trace hooks for Android WebView & Chrome DevTools.
 * Marks and measures are emitted into the browser User Timing API, which Android's
 * Chromium WebView maps directly into system-level Systrace / Perfetto timeline slices.
 */

export function traceMark(name: string): void {
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    try {
      performance.mark(`sparky:${name}`);
    } catch {
      /* ignore */
    }
  }
}

export function traceMeasure(name: string, startMark?: string): void {
  if (typeof performance !== 'undefined' && typeof performance.measure === 'function') {
    try {
      if (startMark) {
        performance.measure(`sparky:${name}`, `sparky:${startMark}`);
      } else {
        performance.measure(`sparky:${name}`);
      }
    } catch {
      /* ignore missing mark */
    }
  }
}

export async function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startMark = `${name}:start`;
  traceMark(startMark);
  try {
    return await fn();
  } finally {
    traceMeasure(name, startMark);
  }
}

/**
 * FPS & Jank monitor for scrolling operations on Android WebView.
 * Records average FPS and dropped frames (<50fps on 60Hz or <100fps on 120Hz).
 */
export function startScrollPerfMonitor(contextName: string): () => { avgFps: number; droppedFrames: number } {
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
    return () => ({ avgFps: 60, droppedFrames: 0 });
  }

  let isRunning = true;
  let frameCount = 0;
  let droppedFrames = 0;
  let lastTime = performance.now();
  const startTime = lastTime;

  traceMark(`${contextName}:scroll:start`);

  function loop(currentTime: number) {
    if (!isRunning) return;
    const delta = currentTime - lastTime;
    lastTime = currentTime;

    // Delta > 22ms on 60Hz indicates a dropped frame
    if (delta > 22) {
      droppedFrames++;
    }
    frameCount++;
    requestAnimationFrame(loop);
  }

  const rafId = requestAnimationFrame(loop);

  return () => {
    isRunning = false;
    cancelAnimationFrame(rafId);
    const totalDuration = (performance.now() - startTime) / 1000;
    const avgFps = totalDuration > 0 ? Math.round(frameCount / totalDuration) : 60;
    traceMark(`${contextName}:scroll:end`);
    traceMeasure(`${contextName}:scroll:duration`, `${contextName}:scroll:start`);
    return { avgFps, droppedFrames };
  };
}
