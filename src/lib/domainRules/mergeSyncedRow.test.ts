import { describe, expect, it } from 'vitest';
import { keepExistingWhenMissing } from '@vanguard/domain';

describe('keepExistingWhenMissing', () => {
  it('brak sesji snu w nowym przebiegu nie kasuje zapisanego snu', () => {
    const next = { date: '2026-09-20', readiness_score: 87, total_sleep_hours: null, bedtime_timestamp: null };
    const existing = { total_sleep_hours: 9.67, bedtime_timestamp: '2026-09-19T22:10:00Z', readiness_score: 80 };
    expect(keepExistingWhenMissing(next, existing)).toEqual({ date: '2026-09-20', readiness_score: 87, total_sleep_hours: 9.67, bedtime_timestamp: '2026-09-19T22:10:00Z' });
  });
  it('bez istniejącego wiersza zwraca nowy bez zmian', () => {
    const next = { date: '2026-09-20', total_sleep_hours: null };
    expect(keepExistingWhenMissing(next, null)).toBe(next);
  });
});
