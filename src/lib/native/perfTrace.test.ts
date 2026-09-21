import { describe, it, expect, vi } from 'vitest';
import { traceMark, traceMeasure, measureAsync, startScrollPerfMonitor } from './perfTrace';

describe('perfTrace', () => {
  it('calls performance.mark with sparky namespace', () => {
    const markSpy = vi.spyOn(performance, 'mark');
    traceMark('testMark');
    expect(markSpy).toHaveBeenCalledWith('sparky:testMark');
    markSpy.mockRestore();
  });

  it('calls performance.measure with sparky namespace', () => {
    const measureSpy = vi.spyOn(performance, 'measure');
    traceMeasure('testMeasure');
    expect(measureSpy).toHaveBeenCalledWith('sparky:testMeasure');
    measureSpy.mockRestore();
  });

  it('measures async function execution', async () => {
    const markSpy = vi.spyOn(performance, 'mark');
    const measureSpy = vi.spyOn(performance, 'measure');

    const result = await measureAsync('asyncTask', async () => {
      return 42;
    });

    expect(result).toBe(42);
    expect(markSpy).toHaveBeenCalledWith('sparky:asyncTask:start');
    expect(measureSpy).toHaveBeenCalledWith('sparky:asyncTask', 'sparky:asyncTask:start');

    markSpy.mockRestore();
    measureSpy.mockRestore();
  });

  it('starts and stops scroll perf monitor cleanly', () => {
    const stop = startScrollPerfMonitor('testList');
    expect(typeof stop).toBe('function');
    const result = stop();
    expect(result).toHaveProperty('avgFps');
    expect(result).toHaveProperty('droppedFrames');
  });
});
