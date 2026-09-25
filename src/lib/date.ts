export * from '@vanguard/domain';
import { TIMEZONE } from '@vanguard/domain';

export function formatDayLabel(dateStr: string, todayStr: string, yesterdayStr?: string, padZero = false): string {
  if (dateStr === todayStr) return 'Dziś';
  if (yesterdayStr && dateStr === yesterdayStr) return 'Wczoraj';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const [, m, d] = parts;
  return padZero ? `${d}.${m}` : `${parseInt(d)}.${parseInt(m)}`;
}

export function formatDashboardDate(): string {
  return new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIMEZONE,
  });
}

export function formatShortDateWarsaw(date: Date | string | number): string {
  return new Date(date).toLocaleDateString('pl-PL', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
  });
}

export function formatLongDateWarsaw(date: Date | string | number): string {
  return new Date(date).toLocaleDateString('pl-PL', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatWeekdayWarsaw(date: Date | string): string {
  const d = typeof date === 'string' && date.length === 10 ? new Date(`${date}T12:00:00Z`) : new Date(date);
  return d.toLocaleDateString('pl-PL', {
    timeZone: TIMEZONE,
    weekday: 'long',
  });
}

import { addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { pl } from 'date-fns/locale';
import { getTodayWarsaw, shiftDateStr } from '@vanguard/domain';

export function getWeekStartWarsaw(dateStr: string): string {
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00Z`);
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function shiftWeekStart(weekStart: string, deltaWeeks: number): string {
  const d = new Date(`${weekStart.slice(0, 10)}T12:00:00Z`);
  const next = deltaWeeks >= 0 ? addWeeks(d, deltaWeeks) : subWeeks(d, Math.abs(deltaWeeks));
  return format(startOfWeek(next, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart.slice(0, 10)}T12:00:00Z`);
  const end = new Date(shiftDateStr(weekStart, 6) + 'T12:00:00Z');
  const a = format(start, 'd MMM', { locale: pl });
  const b = format(end, 'd MMM', { locale: pl });
  return `${a} – ${b}`;
}

export function isCurrentWeek(weekStart: string): boolean {
  return weekStart === getWeekStartWarsaw(getTodayWarsaw());
}

/** Returns a date label like "25 WRZ" — day + short month in uppercase Polish, Warsaw timezone.
 *  Pass a Date, ISO string, or timestamp. */
export function formatShortMonthLabel(date: Date | string | number): string {
  return new Date(date).toLocaleDateString('pl-PL', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
  }).toUpperCase();
}

/** Returns the current year in Warsaw timezone as a number. */
export function getCurrentYear(): number {
  return Number(new Date().toLocaleDateString('pl-PL', { timeZone: TIMEZONE, year: 'numeric' }));
}
