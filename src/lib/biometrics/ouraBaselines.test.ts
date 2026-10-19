import { describe, expect, it } from 'vitest';
import { buildBaselineRows, percentile, type BaselineNight } from './ouraBaselines';
import { shiftDateStr } from '../date';

const ASOF = '2026-10-18';
function nights(count: number, make: (i: number) => Partial<BaselineNight>): BaselineNight[] {
  return Array.from({ length: count }, (_, i) => ({ date: shiftDateStr(ASOF, -(i + 1)), ...make(i) }));
}
const row = (rows: ReturnType<typeof buildBaselineRows>, key: string) => rows.find(r => r.key === key)!;

describe('percentile', () => {
  it('interpolates linearly', () => {
    expect(percentile([1, 2, 3, 4, 5], 0.25)).toBe(2);
    expect(percentile([10, 20], 0.5)).toBe(15);
  });
});

describe('buildBaselineRows', () => {
  const base = nights(20, i => ({ hrv_avg: 50 + i, latency_minutes: 10 + (i % 3) * 5, sleep_efficiency: 80 + (i % 5) }));

  it('classifies the latest night against P25-P75 and stays neutral for HRV', () => {
    const rows = buildBaselineRows([...base, { date: ASOF, hrv_avg: 40, latency_minutes: 40, sleep_efficiency: 70 }], ASOF);
    const hrv = row(rows, 'hrv');
    expect(hrv.status).toBe('below');
    expect(hrv.statusLabel).toBe('Poniżej normy');
    expect(hrv.tone).toBe('neutral');
    expect(hrv.nights).toBe(20);
    expect(hrv.latestPct).toBe(0);
    expect(row(rows, 'latency').tone).toBe('attention');
    expect(row(rows, 'efficiency').tone).toBe('attention');
  });
  it('treats a shorter sleep latency as the good side', () => {
    const rows = buildBaselineRows([...base, { date: ASOF, latency_minutes: 0 }], ASOF);
    expect(row(rows, 'latency').status).toBe('below');
    expect(row(rows, 'latency').tone).toBe('good');
  });
  it('is within the norm for a typical value', () => {
    const rows = buildBaselineRows([...base, { date: ASOF, hrv_avg: 60 }], ASOF);
    expect(row(rows, 'hrv').status).toBe('within');
    expect(row(rows, 'hrv').rangeStartPct).toBeLessThan(row(rows, 'hrv').latestPct!);
  });
  it('requires at least 14 measured nights', () => {
    const rows = buildBaselineRows([...nights(13, () => ({ hrv_avg: 55 })), { date: ASOF, hrv_avg: 40 }], ASOF);
    const hrv = row(rows, 'hrv');
    expect(hrv.status).toBe('insufficient');
    expect(hrv.nights).toBe(13);
    expect(hrv.rangeText).toBe('13/14 nocy z pomiarem');
    expect(hrv.latestPct).toBeNull();
  });
  it('reports a missing latest night and ignores nights older than 60 days', () => {
    const old = nights(80, () => ({ rhr_avg: 50 })).filter(n => n.date < shiftDateStr(ASOF, -61));
    const rows = buildBaselineRows([...old, ...nights(14, () => ({ rhr_avg: 52 }))], ASOF);
    expect(row(rows, 'rhr').status).toBe('no-latest');
    expect(row(rows, 'rhr').nights).toBe(14);
  });
  it('derives deep shares and a bedtime axis that survives midnight', () => {
    const hist = nights(15, () => ({ deep_sleep_hours: 1.5, total_sleep_hours: 7.5, bedtime_timestamp: '2026-10-10T22:30:00Z' }));
    const rows = buildBaselineRows([...hist, { date: ASOF, deep_sleep_hours: 1.5, total_sleep_hours: 6, bedtime_timestamp: '2026-10-17T22:45:00Z' }], ASOF);
    expect(row(rows, 'deep').latest).toBe(25);
    expect(row(rows, 'deep').status).toBe('above');
    expect(row(rows, 'bedtime').latestText).toBe('00:45');
    expect(row(rows, 'bedtime').status).toBe('above');
  });
});
