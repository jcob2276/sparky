import { describe, expect, it } from 'vitest';
import { bucketSeries, daysWithData, delta, periodValue } from './aggregate';

const rows = [
  { date: '2026-10-19', value: 2 },
  { date: '2026-10-20', value: null },
  { date: '2026-10-21', value: 4 },
];

describe('aggregate', () => {
  it('liczy sumę, średnią i ostatnią wartość tylko ze znanych dni', () => {
    expect(periodValue(rows, '2026-10-19', '2026-10-25', 'sum')).toBe(6);
    expect(periodValue(rows, '2026-10-19', '2026-10-25', 'avg')).toBe(3);
    expect(periodValue(rows, '2026-10-19', '2026-10-25', 'last')).toBe(4);
  });

  it('brak danych to null, nie zero', () => {
    expect(periodValue(rows, '2026-11-01', '2026-11-07', 'sum')).toBeNull();
    expect(daysWithData(rows, '2026-10-19', '2026-10-25')).toBe(2);
  });

  it('kubełki zostawiają dziury jako null', () => {
    const buckets = [
      { start: '2026-10-19', end: '2026-10-19' },
      { start: '2026-10-20', end: '2026-10-20' },
      { start: '2026-10-21', end: '2026-10-21' },
    ];
    expect(bucketSeries(rows, buckets, 'sum')).toEqual([2, null, 4]);
  });

  it('różnica wymaga obu wartości', () => {
    expect(delta(5, 3)).toBe(2);
    expect(delta(null, 3)).toBeNull();
  });
});
