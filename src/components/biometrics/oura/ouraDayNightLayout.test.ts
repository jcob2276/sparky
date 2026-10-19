import { describe, expect, it } from 'vitest';
import {
  areaPath, buildPlotFrame, clamp, hourTicks, linearScale, linePath, paddedExtent, resolveViewWindow, splitOnGaps, stackMarkerRows, stageRects,
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

  it('zooms to bedtime-30min .. wake+30min and falls back without sleep', () => {
    const w = ['2026-10-17T04:00:00.000Z', '2026-10-18T07:00:00.000Z'] as const;
    const night = resolveViewWindow(w[0], w[1], '2026-10-17T21:40:00.000Z', '2026-10-18T05:30:00.000Z', 'night');
    expect(night.mode).toBe('night');
    expect(night.startMs).toBe(Date.parse('2026-10-17T21:10:00.000Z'));
    expect(night.endMs).toBe(Date.parse('2026-10-18T06:00:00.000Z'));
    expect(resolveViewWindow(w[0], w[1], null, null, 'night').mode).toBe('full');
    expect(resolveViewWindow(w[0], w[1], '2026-10-17T21:40:00.000Z', '2026-10-18T05:30:00.000Z', 'full').startMs).toBe(Date.parse(w[0]));
  });

  it('never extends the zoomed window beyond the loaded window', () => {
    const v = resolveViewWindow('2026-10-17T21:30:00.000Z', '2026-10-18T05:40:00.000Z', '2026-10-17T21:40:00.000Z', '2026-10-18T05:30:00.000Z', 'night');
    expect(v.startMs).toBe(Date.parse('2026-10-17T21:30:00.000Z'));
    expect(v.endMs).toBe(Date.parse('2026-10-18T05:40:00.000Z'));
  });

  it('zoomed frame drops caffeine lanes and gives touch-sized rows', () => {
    const full = buildPlotFrame(343);
    const zoom = buildPlotFrame(343, { zoomed: true });
    expect(zoom.caffeine.height).toBe(0);
    expect(zoom.gap.height).toBe(0);
    expect(zoom.events.height).toBe(0);
    expect(buildPlotFrame(343, { zoomed: true, showEvents: true }).events.height).toBeGreaterThan(0);
    expect(zoom.hypnoRow).toBeGreaterThan(full.hypnoRow);
    expect(zoom.hr.height).toBeGreaterThanOrEqual(44);
    expect(zoom.hypnoRow).toBeGreaterThanOrEqual(24);
    expect(zoom.axis.top + zoom.axis.height).toBe(zoom.height);
  });
});
