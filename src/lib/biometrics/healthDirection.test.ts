import { describe, expect, it } from 'vitest';
import { buildHealthDirection } from './healthDirection';

const asOf = '2026-10-16';
const rows = Array.from({ length: 14 }, (_, index) => ({
  date: `2026-10-${String(index + 3).padStart(2, '0')}`,
  sleep_score: index < 7 ? 60 : 80,
  readiness_score: index < 7 ? 85 : 65,
  hrv_avg: index < 7 ? 40 : 45,
}));

describe('health direction from recorded calendar days', () => {
  it('compares adjacent calendar weeks without hiding disagreeing signals', () => {
    const result = buildHealthDirection({ asOf, summaries: rows });
    expect(result.currentStart).toBe('2026-10-10');
    expect(result.previousStart).toBe('2026-10-03');
    expect(result.previousEnd).toBe('2026-10-09');
    expect(result.headline).toBe('Sen i regeneracja zmieniają się różnie');
    expect(result.metrics[0]).toMatchObject({ current: 80, previous: 60, delta: 20, currentCount: 7, previousCount: 7, latest: 80 });
    expect(result.metrics[1].delta).toBe(-20);
    expect(result.metrics[2]).toMatchObject({ current: 45, previous: 40, delta: 5 });
  });

  it('does not count duplicates, future rows or old rows as extra days', () => {
    const result = buildHealthDirection({ asOf, summaries: [
      ...rows.slice().reverse(), rows[0], rows[13],
      { date: '2026-10-17', sleep_score: 100 },
      { date: '2026-09-01', sleep_score: 100 },
    ] });
    expect(result.metrics[0]).toMatchObject({ current: 80, previous: 60, currentCount: 7, previousCount: 7 });
  });

  it('requires four measured days in each week independently per metric', () => {
    const result = buildHealthDirection({ asOf, summaries: rows.map((row, index) => ({
      ...row, sleep_score: index >= 10 ? row.sleep_score : null,
      readiness_score: index < 3 || index >= 7 ? row.readiness_score : null,
    })) });
    expect(result.metrics[0]).toMatchObject({ currentCount: 4, previousCount: 0, delta: null });
    expect(result.metrics[1]).toMatchObject({ currentCount: 7, previousCount: 3, delta: null });
    expect(result.metrics[2].delta).toBe(5);
    expect(result.headline).toBe('Zbieramy dane do porównania');
  });

  it('merges same-day sources, preserves measured zero scores and rejects invalid values', () => {
    const result = buildHealthDirection({ asOf, summaries: [...rows, { date: asOf, sleep_score: 0, readiness_score: NaN, hrv_avg: -1 }],
      enhanced: [{ date: asOf, sleep_score: 99, readiness_score: 70, sleep_average_hrv: 50 }] });
    expect(result.metrics[0]).toMatchObject({ latest: 0, currentCount: 7 });
    expect(result.metrics[1].latest).toBe(70);
    expect(result.metrics[2].latest).toBe(50);
  });

  it('does not present an older reading as the latest selected day or infer direction from one night', () => {
    const result = buildHealthDirection({ asOf, summaries: [{ date: '2026-10-15', sleep_score: 90 }] });
    expect(result.metrics[0]).toMatchObject({ latest: null, currentCount: 1, previousCount: 0, delta: null });
    expect(result.headline).toBe('Zbieramy dane do porównania');
  });

  it('describes higher scores without treating a higher HRV as proof of better health', () => {
    const result = buildHealthDirection({ asOf, summaries: rows.map((row, index) => ({ ...row, readiness_score: index < 7 ? 65 : 85 })) });
    expect(result.headline).toBe('Sen i regeneracja wyżej niż tydzień temu');
  });

  it('does not display a negative zero when rounded weekly means are equal', () => {
    const scores = [60, 60, 60, 60, 60, 61, null, 60, 60, 60, 60, 60, 60, 61];
    const result = buildHealthDirection({ asOf, summaries: rows.map((row, index) => ({ ...row, sleep_score: scores[index] })) });
    expect(result.metrics[0].delta).toBe(0);
  });
});
