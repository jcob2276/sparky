import type { DailySleepRecord } from '@vanguard/domain';
import type { Tables } from '../database.types';
import { shiftDateStr, TIMEZONE } from '../date';

function recordedClock(value: string | null): string | null {
  if (!value) return null;
  if (value.includes('T')) {
    const date = new Date(value);
    return Number.isFinite(date.getTime())
      ? date.toLocaleTimeString('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' })
      : null;
  }
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
}

export function selectSleepConsistencyRecords(
  history: Tables<'oura_enhanced'>[],
  current: Tables<'oura_enhanced'> | null | undefined,
  endDate: string,
): DailySleepRecord[] {
  const startDate = shiftDateStr(endDate, -6);
  const nights = new Map(history.map((night) => [night.date, night]));
  if (current) nights.set(current.date, current);
  return [...nights.values()].flatMap((night) => {
    if (night.date < startDate || night.date > endDate) return [];
    const bedtime = recordedClock(night.bedtime_start);
    const wakeTime = recordedClock(night.bedtime_end);
    return bedtime && wakeTime ? [{ date: night.date, bedtime, wakeTime }] : [];
  }).sort((a, b) => a.date.localeCompare(b.date));
}
