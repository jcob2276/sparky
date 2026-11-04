import { describe, expect, it } from 'vitest';
import { formatDecimalPl, pluralPl } from './formatPl';

describe('formatPl', () => {
  it('używa przecinka dziesiętnego i obcina zbędne zera', () => {
    expect(formatDecimalPl(1.8)).toBe('1,8');
    expect(formatDecimalPl(25)).toBe('25');
    expect(formatDecimalPl(25.84)).toBe('25,8');
  });

  it('odmienia rzeczownik według polskich reguł', () => {
    const forms = (n: number) => pluralPl(n, 'pozycja', 'pozycje', 'pozycji');
    expect([1, 2, 4, 5, 12, 14, 22, 25].map(forms)).toEqual(['pozycja', 'pozycje', 'pozycje', 'pozycji', 'pozycji', 'pozycji', 'pozycje', 'pozycji']);
    expect(forms(0)).toBe('pozycji');
  });
});
