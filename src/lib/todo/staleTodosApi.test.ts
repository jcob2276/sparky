import { describe, expect, it } from 'vitest';
import { daysIdleSince } from './staleTodosApi';

describe('daysIdleSince', () => {
  const now = Date.parse('2026-10-25T12:00:00Z');

  it('counts full days since the last change', () => {
    expect(daysIdleSince('2026-06-13T12:00:00Z', now)).toBe(134);
    expect(daysIdleSince('2026-10-24T13:00:00Z', now)).toBe(0);
  });

  it('never returns a negative number for future timestamps', () => {
    expect(daysIdleSince('2026-10-30T12:00:00Z', now)).toBe(0);
  });
});
