import { describe, expect, it } from 'vitest';
import { ouraDayTimelineFixture as timeline } from './ouraDayTimelineFixture';
import {
  buildAltRows, buildChartAriaLabel, caffeineGap, describeMoment, formatDuration, formatMomentLine, valueAt,
} from './ouraDayNightReadout';

describe('ouraDayNightReadout', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(45 * 60_000)).toBe('45 min');
    expect(formatDuration(12 * 3_600_000)).toBe('12 h');
    expect(formatDuration((11 * 60 + 50) * 60_000)).toBe('11 h 50 min');
  });

  it('interpolates inside data and returns null beyond the gap tolerance', () => {
    const s = [{ ms: 0, value: 0 }, { ms: 10, value: 10 }];
    expect(valueAt(s, 5, 20, true)).toBe(5);
    expect(valueAt(s, 100, 20, true)).toBeNull();
    expect(valueAt([], 1, 20, true)).toBeNull();
  });

  it('describes a night moment in Warsaw time with stage, vitals and caffeine', () => {
    const moment = describeMoment(timeline, Date.UTC(2026, 9, 18, 0, 10)); // 02:10 Warsaw
    expect(moment.time).toBe('02:10');
    expect(moment.stage).not.toBeNull();
    expect(moment.hr).not.toBeNull();
    expect(moment.hrv).not.toBeNull();
    expect(moment.caffeineMg).toBeGreaterThan(0);
    expect(formatMomentLine(moment)).toMatch(/^02:10 · .+ · \d+ bpm · HRV \d+ ms · kofeina w ciele ~\d+ mg$/);
  });

  it('lists markers close to the cursor and omits missing signals during the day', () => {
    const moment = describeMoment(timeline, Date.parse('2026-10-17T06:12:00Z')); // 08:12
    expect(moment.stage).toBeNull();
    expect(moment.hrv).toBeNull();
    expect(moment.markers.map((m) => m.label)).toContain('Kawa');
  });

  it('computes last caffeine to bedtime', () => {
    expect(caffeineGap(timeline)?.label).toBe('12 h');
    expect(caffeineGap({ ...timeline, sleepStart: null })).toBeNull();
    expect(caffeineGap({ ...timeline, summary: { ...timeline.summary, lastCaffeineAt: null } })).toBeNull();
  });

  it('describes the chart for assistive tech and builds chronological alt rows', () => {
    const label = buildChartAriaLabel(timeline);
    expect(label).toContain('23:40');
    expect(label).toContain('07:30');
    expect(label).toContain('175 mg');
    const rows = buildAltRows(timeline);
    expect(rows[0].time).toBe('06:00');
    expect(rows.some((r) => r.summary.includes('Magnez'))).toBe(true);
    expect(rows.map((r) => r.ms)).toEqual([...rows.map((r) => r.ms)].sort((a, b) => a - b));
  });

});
