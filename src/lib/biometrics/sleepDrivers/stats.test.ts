import { describe, expect, it } from 'vitest';
import { mean, median, rankCorrelation, round } from './stats';

describe('rankCorrelation', () => {
  it('liczy Spearmana z rangami średnimi dla remisów', () => {
    const r = rankCorrelation([[1, 1], [2, 2], [2, 3], [3, 4]]);
    expect(r?.rho).toBeCloseTo(0.9487, 3);
    expect(r?.n).toBe(4);
  });

  it('zwraca 1 dla idealnie monotonicznej zależności z remisami', () => {
    const pairs: Array<[number, number]> = Array.from({ length: 12 }, (_, i) => [Math.floor(i / 3), Math.floor(i / 3) * 10]);
    expect(rankCorrelation(pairs)?.rho).toBeCloseTo(1, 10);
  });

  it('zgadza się ze wzorem rho = 1 - 6Σd²/(n(n²-1)) bez remisów', () => {
    const y = [1, 2, 3, 4, 5, 6, 8, 7];
    const r = rankCorrelation(y.map((v, i) => [i + 1, v]));
    expect(r?.rho).toBeCloseTo(1 - (6 * 2) / (8 * 63), 6);
    expect(r?.pValue).not.toBeNull();
    expect(r?.pValue ?? 1).toBeLessThan(0.001);
  });

  it('nie podaje p-value dla n < 8', () => {
    const r = rankCorrelation([[1, 1], [2, 3], [3, 2], [4, 5], [5, 4]]);
    expect(r?.pValue).toBeNull();
  });

  it('zwraca null przy braku zmienności lub zbyt małym n', () => {
    expect(rankCorrelation([[1, 5], [2, 5], [3, 5], [4, 5]])).toBeNull();
    expect(rankCorrelation([[1, 1], [2, 2]])).toBeNull();
  });

  it('p-value jest duże dla szumu', () => {
    const noise: Array<[number, number]> = [[1, 5], [2, 1], [3, 6], [4, 2], [5, 7], [6, 3], [7, 8], [8, 4], [9, 5], [10, 6]];
    expect(rankCorrelation(noise)?.pValue ?? 0).toBeGreaterThan(0.3);
  });
});

describe('helpery', () => {
  it('mean, median, round', () => {
    expect(mean([1, 2, 6])).toBe(3);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(round(-0.04, 1)).toBe(0);
    expect(round(1.26, 1)).toBe(1.3);
  });
});
