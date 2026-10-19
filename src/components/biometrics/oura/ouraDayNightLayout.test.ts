import { describe, expect, it } from 'vitest';
import {
  areaPath, buildPlotFrame, clamp, hourTicks, linearScale, linePath, paddedExtent, splitOnGaps, stackMarkerRows, stageRects,
} from './ouraDayNightLayout';

describe('ouraDayNightLayout', () => {
  it('maps and inverts linearly, including reversed ranges', () => {
    const s = linearScale([0, 10], [100, 0]);
    expect(s.map(5)).toBe(50);
    expect(s.map(0)).toBe(100);
    expect(s.invert(25)).toBeCloseTo(7.5);
  });

  it('does not divide by zero for a flat domain', () => {
    expect(Number.isFinite(linearScale([3, 3], [0, 10]).map(3))).toBe(true);
  });

  it('pads extents and pins caffeine-style domains to zero', () => {
    expect(paddedExtent([], false)).toEqual([0, 1]);
    const [lo, hi] = paddedExtent([50, 60], true);
    expect(lo).toBe(0);
    expect(hi).toBeGreaterThan(60);
    expect(paddedExtent([50, 60], false)[0]).toBeLessThan(50);
  });

  it('builds line and area paths', () => {
    const pts = [{ x: 0, y: 10 }, { x: 5, y: 4 }];
    expect(linePath(pts)).toBe('M0 10 L5 4');
    expect(areaPath(pts, 20)).toBe('M0 10 L5 4 L5 20 L0 20 Z');
    expect(areaPath([], 20)).toBe('');
  });

  it('breaks series on gaps', () => {
    const runs = splitOnGaps([{ ms: 0, value: 1 }, { ms: 10, value: 2 }, { ms: 100, value: 3 }], 20);
    expect(runs.map((r) => r.length)).toEqual([2, 1]);
  });

  it('ticks fall on Warsaw full hours (UTC whole hours)', () => {
    const start = Date.UTC(2026, 9, 17, 4, 30);
    const ticks = hourTicks(start, start + 5 * 3_600_000, 2);
    expect(ticks.every((t) => t % 3_600_000 === 0)).toBe(true);
    expect(ticks[0]).toBeGreaterThanOrEqual(start);
    expect(ticks[1] - ticks[0]).toBe(2 * 3_600_000);
  });

  it('places hypnogram rects on their rows and clamps to the window', () => {
    const time = linearScale([0, 100], [0, 200]);
    const rects = stageRects([
      { stage: 'deep', start: new Date(-50).toISOString(), end: new Date(50).toISOString() },
      { stage: 'awake', start: new Date(500).toISOString(), end: new Date(600).toISOString() },
    ], time, 10, 15);
    expect(rects).toHaveLength(1);
    expect(rects[0]).toMatchObject({ stage: 'deep', x: 0, width: 100, y: 10 + 3 * 15 });
  });

  it('stacks close markers on separate rows and reuses rows when there is room', () => {
    expect(stackMarkerRows([10, 14, 60], 22, 2)).toEqual([0, 1, 0]);
    expect(stackMarkerRows([10, 12, 14], 22, 2).every((r) => r < 2)).toBe(true);
  });

  it('keeps clamp and frame sane for tiny widths', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    const frame = buildPlotFrame(100);
    expect(frame.width).toBe(280);
    expect(frame.x1).toBeGreaterThan(frame.x0);
    expect(frame.axis.top + frame.axis.height).toBe(frame.height);
  });
});
