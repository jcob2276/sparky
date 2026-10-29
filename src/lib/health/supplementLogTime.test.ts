import { afterEach, describe, expect, it, vi } from 'vitest';
import { supplementLoggedAtForDate } from './supplementLogTime';

vi.mock('../date', () => ({
  getTodayWarsaw: () => '2026-10-29',
}));

describe('supplementLoggedAtForDate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stamps now for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-29T15:30:00.000Z'));
    expect(supplementLoggedAtForDate('2026-10-29')).toBe('2026-10-29T15:30:00.000Z');
  });

  it('leaves historical day without fabricated clock time', () => {
    expect(supplementLoggedAtForDate('2026-10-20')).toBeNull();
  });
});
