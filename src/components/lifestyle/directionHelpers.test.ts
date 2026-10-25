import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tables } from '../../lib/database.types';
import { calculateStats } from './directionHelpers';

const day = (date: string, result: string | null) => ({ id: date, date, result }) as unknown as Tables<'daily_wins'>;

describe('calculateStats', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-25T10:00:00Z')); });
  afterEach(() => vi.useRealTimers());

  it('plan na jutro nie zeruje serii', () => {
    const history = [day('2026-10-26', null), day('2026-10-25', null), day('2026-10-24', 'Z'), day('2026-10-23', 'Z'), day('2026-10-22', 'P')];
    expect(calculateStats(history).streak).toBe(2);
  });

  it('bez planu na jutro liczy tak samo', () => {
    const history = [day('2026-10-25', null), day('2026-10-24', 'Z'), day('2026-10-23', 'Z'), day('2026-10-22', 'P')];
    expect(calculateStats(history).streak).toBe(2);
  });
});
