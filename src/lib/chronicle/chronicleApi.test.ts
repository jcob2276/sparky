import { describe, expect, it } from 'vitest';
import { warsawDateKey } from './chronicleApi';

describe('warsawDateKey', () => {
  it('wpis po północy czasu warszawskiego należy do nowego dnia, nie do poprzedniego dnia UTC', () => {
    expect(warsawDateKey('2026-10-23T22:30:00Z')).toBe('2026-10-24');
    expect(warsawDateKey('2026-10-23T12:00:00Z')).toBe('2026-10-23');
  });

  it('zimą i latem przesunięcie jest inne', () => {
    expect(warsawDateKey('2026-01-15T23:30:00Z')).toBe('2026-01-16');
    expect(warsawDateKey('2026-07-15T21:30:00Z')).toBe('2026-07-15');
    expect(warsawDateKey('2026-07-15T22:30:00Z')).toBe('2026-07-16');
  });

  it('niepoprawna data daje pusty klucz', () => {
    expect(warsawDateKey('nie-data')).toBe('');
  });
});
