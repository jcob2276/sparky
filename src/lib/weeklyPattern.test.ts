import { describe, expect, it } from 'vitest';
import type { ImpactFactor } from '@vanguard/domain';
import { lagText, patternMeta, pickWeeklyPattern } from './weeklyPattern';

const factor = (id: string, evidence_level: ImpactFactor['evidence_level'], lag_days = 0): ImpactFactor => ({
  id, x_metric: 'a', y_metric: 'b', x_label: 'A', y_label: 'B', lag_days, r: 0.4, n: 30, p: 0.01, ci_lower: 0.1, ci_upper: 0.6,
  ci_crosses_zero: false, is_stable: true, evidence_level, natural_effect: 'x', decision_value: 1, scatter: [], method: 'pearson', category: 'sen',
}) as ImpactFactor;

describe('pickWeeklyPattern', () => {
  it('bez mocnych zależności nic nie pokazuje, słabe się nie liczą', () => {
    expect(pickWeeklyPattern([], '2026-10-19')).toBeNull();
    expect(pickWeeklyPattern([factor('w', 'hypothesis')], '2026-10-19')).toBeNull();
  });

  it('wybór jest stały w obrębie tygodnia i rotuje między tygodniami', () => {
    const pool = ['a', 'b', 'c'].map((id) => factor(id, 'confirmed'));
    const week1 = pickWeeklyPattern(pool, '2026-10-19')?.id;
    const week2 = pickWeeklyPattern(pool, '2026-10-26')?.id;
    const week3 = pickWeeklyPattern(pool, '2026-11-02')?.id;
    expect(pickWeeklyPattern(pool, '2026-10-19')?.id).toBe(week1);
    expect(new Set([week1, week2, week3]).size).toBe(3);
  });

  it('bierze tylko pierwsze 5 najlepszych', () => {
    const pool = Array.from({ length: 8 }, (_, i) => factor(`f${i}`, 'confirmed'));
    const ids = new Set(Array.from({ length: 12 }, (_, i) => pickWeeklyPattern(pool, `2026-${String(1 + Math.floor(i / 4)).padStart(2, '0')}-${String(1 + (i % 4) * 7).padStart(2, '0')}`)?.id));
    expect([...ids].every((id) => ['f0', 'f1', 'f2', 'f3', 'f4'].includes(id as string))).toBe(true);
  });
});

describe('opis', () => {
  it('pokazuje liczbę dni, siłę dowodu i opóźnienie efektu', () => {
    expect(lagText(0)).toBe('tego samego dnia');
    expect(lagText(2)).toBe('2 dni później');
    expect(patternMeta(factor('a', 'probable', 1))).toBe('30 dni danych · wyraźny sygnał · efekt następnego dnia');
  });
});
