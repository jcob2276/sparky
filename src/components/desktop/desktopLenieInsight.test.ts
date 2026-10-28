import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeLenieStats, type LenieLogRow } from './desktopLenieInsight';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

const logs: LenieLogRow[] = [
  { date: '2026-10-28', logged_at: '2026-10-28T20:15:00Z', final_stimulus: 'A + B', context_note: 'Kontekst' },
  { date: '2026-10-27', logged_at: '2026-07-01T11:30:00Z' },
  { date: '2026-10-26', logged_at: 'invalid' },
  { date: '2026-10-25', logged_at: null },
  { date: '2026-09-01', logged_at: '2026-01-01T23:05:00Z', final_stimulus: 'C' },
];

describe('computeLenieStats', () => {
  it('preserves the complete result, including DST, invalid timestamps and multi-events', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
    const result = computeLenieStats(logs);
    expect(result).toMatchSnapshot();
    expect(result.recentLogs.map(log => log.timeStr)).toEqual(['21:15', '13:30', null, null, '00:05']);
    expect(result.totalEjaculations30).toBe(5);
  });

  it('reuses the formatter across entries and repeated calculations', async () => {
    vi.resetModules();
    const formatter = vi.spyOn(Intl, 'DateTimeFormat');
    const { computeLenieStats: compute } = await import('./desktopLenieInsight');
    const initializations = formatter.mock.calls.length;
    compute(logs);
    compute(logs);
    expect(formatter).toHaveBeenCalledTimes(initializations);
  });
});
