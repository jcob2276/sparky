import { describe, expect, it } from 'vitest';
import { compareCacheKey } from './aiCompare';

const a = { label: '19–25 paź', start: '2026-10-19', end: '2026-10-25' };
const b = { label: '12–18 paź', start: '2026-10-12', end: '2026-10-18' };

describe('compareCacheKey', () => {
  it('jest inny dla innej pary okresów, innego dnia i innego użytkownika', () => {
    const base = compareCacheKey('u1', a, b, '2026-10-24');
    expect(compareCacheKey('u1', b, a, '2026-10-24')).not.toBe(base);
    expect(compareCacheKey('u1', a, b, '2026-10-25')).not.toBe(base);
    expect(compareCacheKey('u2', a, b, '2026-10-24')).not.toBe(base);
  });

  it('nie zależy od etykiet, tylko od granic okresów', () => {
    expect(compareCacheKey('u1', { ...a, label: 'inna' }, b, '2026-10-24')).toBe(compareCacheKey('u1', a, b, '2026-10-24'));
  });

  it('klucz zawiera wersję analizy, więc wynik z poprzedniej wersji funkcji nie jest pokazywany', () => {
    expect(compareCacheKey('u1', a, b, '2026-10-24')).toMatch(/^period-compare-ai:v\d+:u1:/);
  });
});

