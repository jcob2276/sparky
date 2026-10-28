import { describe, expect, it } from 'vitest';
import { buildSleepRegularity, formatAxisClock, formatDuration, type SleepRegularityRow } from './ouraSleepRegularity';

// 2026-10-19 is still CEST (UTC+2): 21:00Z = 23:00 local.
const TODAY = '2026-10-19';

function night(date: string, startIso: string, endIso: string, hours: number | null): SleepRegularityRow {
  return { date, bedtime_start: startIso, bedtime_end: endIso, main_sleep_hours: hours };
}

/** n nights ending on TODAY, falling asleep at 23:00 local (21:00Z) and sleeping 7 h. */
function regularNights(n: number): SleepRegularityRow[] {
  return Array.from({ length: n }, (_, i) => {
    const day = 19 - i;
    const d = String(day).padStart(2, '0');
    const prev = String(day - 1).padStart(2, '0');
    return night(`2026-10-${d}`, `2026-10-${prev}T21:00:00Z`, `2026-10-${d}T04:30:00Z`, 7);
  });
}

describe('buildSleepRegularity', () => {
  it('reports progress instead of numbers below 7 nights', () => {
    const result = buildSleepRegularity(regularNights(6), TODAY);
    expect(result.status).toBe('insufficient');
    expect(result.nights).toHaveLength(6);
    expect(result.needed).toBe(7);
    expect(result.bedtimeStdMin).toBeNull();
    expect(result.sleepDebtMinutes).toBeNull();
  });

  it('is perfectly consistent when bedtimes do not move', () => {
    const result = buildSleepRegularity(regularNights(10), TODAY);
    expect(result.status).toBe('ready');
    expect(formatAxisClock(result.medianBedtimeAxis ?? -1)).toBe('23:00');
    expect(formatAxisClock(result.medianWakeAxis ?? -1)).toBe('06:30');
    expect(result.bedtimeStdMin).toBe(0);
    expect(result.consistencyPct).toBe(100);
  });

  it('keeps a post-midnight bedtime in the evening, not in the morning', () => {
    const rows = [...regularNights(9), night('2026-10-10', '2026-10-09T23:03:00Z', '2026-10-10T06:30:00Z', 6.5)];
    const result = buildSleepRegularity(rows, TODAY);
    const late = result.nights.find((n) => n.date === '2026-10-10');
    expect(formatAxisClock(late?.bedtimeAxis ?? -1)).toBe('01:03');
    expect(late?.bedtimeAxis).toBe(423);
    expect(late?.wakeAxis).toBe(423 + 447);
    expect(late?.withinTolerance).toBe(false);
    expect(result.consistencyPct).toBe(90);
    expect(result.bedtimeStdMin).toBeGreaterThan(30);
  });

  it('counts nights within +-45 min of the median', () => {
    const rows = regularNights(8).map((row, i) => (i < 2
      ? { ...row, bedtime_start: row.bedtime_start?.replace('T21:00', 'T21:44') ?? null }
      : row));
    expect(buildSleepRegularity(rows, TODAY).nightsWithinTolerance).toBe(8);
    const far = regularNights(8).map((row, i) => (i < 2
      ? { ...row, bedtime_start: row.bedtime_start?.replace('T21:00', 'T21:50') ?? null }
      : row));
    expect(buildSleepRegularity(far, TODAY).nightsWithinTolerance).toBe(6);
  });

  it('uses the default 8 h target with fewer than 14 nights and sums only shortfalls', () => {
    const rows = [...regularNights(7), night('2026-10-12', '2026-10-11T21:00:00Z', '2026-10-12T07:00:00Z', 9)];
    const result = buildSleepRegularity(rows, TODAY);
    expect(result.targetSource).toBe('default');
    expect(result.targetMinutes).toBe(480);
    // 7 nights x (8 h - 7 h) = 420 min; the 9 h night does not reduce it.
    expect(result.sleepDebtMinutes).toBe(420);
  });

  it('takes the personal target from the median of the last 60 nights', () => {
    const old = Array.from({ length: 20 }, (_, i) => {
      const d = String(i + 2).padStart(2, '0');
      const prev = String(i + 1).padStart(2, '0');
      return night(`2026-09-${d}`, `2026-09-${prev}T21:00:00Z`, `2026-09-${d}T04:00:00Z`, 6);
    });
    const result = buildSleepRegularity([...old, ...regularNights(10)], TODAY);
    expect(result.targetSource).toBe('personal');
    expect(result.targetMinutes).toBe(6 * 60);
    expect(result.sleepDebtMinutes).toBe(0);
  });

  it('ignores nights outside the window, missing data and impossible intervals', () => {
    const rows = [
      ...regularNights(7),
      night('2026-10-01', '2026-09-30T21:00:00Z', '2026-10-01T05:00:00Z', 7),
      night('2026-10-11', '2026-10-10T21:00:00Z', '2026-10-11T05:00:00Z', null),
      night('2026-10-12', '2026-10-12T05:00:00Z', '2026-10-11T21:00:00Z', 7),
    ];
    const result = buildSleepRegularity(rows, TODAY);
    expect(result.nights).toHaveLength(7);
    expect(result.nights.at(-1)?.isLatest).toBe(true);
    expect(result.nights.filter((n) => n.isLatest)).toHaveLength(1);
  });

  it('labels weekdays in Polish', () => {
    const result = buildSleepRegularity(regularNights(7), TODAY);
    expect(result.nights.at(-1)?.weekday).toBe('pn'); // 2026-10-19 is Monday
  });
});

describe('formatters', () => {
  it('formats durations and axis clocks', () => {
    expect(formatDuration(395)).toBe('6 h 35 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(25)).toBe('25 min');
    expect(formatAxisClock(0)).toBe('18:00');
    expect(formatAxisClock(1440)).toBe('18:00');
  });
});
