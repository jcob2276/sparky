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
  const now = new Date();
  const dateStr = now.toLocaleDateString('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TIMEZONE,
  });
  const timeStr = now.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  });
  return `${dateStr} · ${timeStr}`;
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

export { getTodayWarsaw, shiftDateStr };

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

