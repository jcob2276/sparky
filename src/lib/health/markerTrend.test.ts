import { describe, expect, it } from 'vitest';
import { latestBatchKeys, markerChange, sparkValues } from './markerTrend';
import type { MedicalLabRow } from './medicalAnalytics';

const row = (id: string, key: string, date: string, value: number): MedicalLabRow => ({
  id, marker_key: key, marker_name: key, result_date: date, value, category: null, unit: null,
  ref_low: null, ref_high: null, ref_text: null, flag: null, source_name: 's', provider: null, notes: null,
});

describe('markerTrend', () => {
  it('sparkValues zwraca wartości od najstarszej do najnowszej', () => {
    expect(sparkValues([row('3', 'a', '2026-03-01', 30), row('2', 'a', '2026-02-01', 20), row('1', 'a', '2026-01-01', 10)])).toEqual([10, 20, 30]);
  });

  it('markerChange liczy różnicę i procent, brak poprzedniego to null', () => {
    expect(markerChange(row('2', 'a', '2026-02-01', 15), row('1', 'a', '2026-01-01', 10))).toEqual({ delta: 5, pct: 50, direction: 'up' });
    expect(markerChange(row('2', 'a', '2026-02-01', 10), row('1', 'a', '2026-01-01', 10))?.direction).toBe('flat');
    expect(markerChange(row('1', 'a', '2026-01-01', 10), null)).toBeNull();
  });

  it('latestBatchKeys wybiera markery z najnowszej daty', () => {
    const keys = latestBatchKeys([row('1', 'a', '2026-01-01', 1), row('2', 'b', '2026-03-01', 2), row('3', 'c', '2026-03-01', 3)]);
    expect([...keys].sort()).toEqual(['b', 'c']);
  });
});
