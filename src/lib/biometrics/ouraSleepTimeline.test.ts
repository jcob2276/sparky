import { describe, expect, it } from 'vitest';
import { buildSleepTimeline } from './ouraSleepTimeline';

describe('buildSleepTimeline', () => {
  it('preserves short awake transitions', () => {
    const result = buildSleepTimeline({
      phases: '2214223',
      bedtimeStart: '2026-07-27T23:31:00+02:00',
      bedtimeEnd: '2026-07-28T08:42:00+02:00',
    });

    expect(result.segments.map(({ stage, blocks }) => [stage, blocks])).toEqual([
      ['light', 2],
      ['deep', 1],
      ['awake', 1],
      ['light', 2],
      ['rem', 1],
    ]);
  });

  it('derives labels across midnight from the actual interval', () => {
    const result = buildSleepTimeline({
      phases: '2'.repeat(110),
      bedtimeStart: '2026-07-27T23:31:00+02:00',
      bedtimeEnd: '2026-07-28T08:42:00+02:00',
    });

    expect(result.axisLabels[0]).toBe('23:31');
    expect(result.axisLabels.at(-1)).toBe('08:42');
  });

  it('returns unavailable instead of fabricating phases', () => {
    const result = buildSleepTimeline({
      phases: null,
      bedtimeStart: '2026-07-27T23:31:00+02:00',
      bedtimeEnd: '2026-07-28T08:42:00+02:00',
    });

    expect(result.status).toBe('unavailable');
    expect(result.segments).toEqual([]);
  });

  it('reports invalid stage characters without replacing them', () => {
    const result = buildSleepTimeline({
      phases: '22x33',
      bedtimeStart: '2026-07-27T23:31:00+02:00',
      bedtimeEnd: '2026-07-27T23:56:00+02:00',
    });

    expect(result.status).toBe('invalid');
    expect(result.segments).toEqual([]);
  });
});
