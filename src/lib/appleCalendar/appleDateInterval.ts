/**
 * @module appleDateInterval
 * @role Implements Apple Foundation `Calendar` and `DateInterval` specifications:
 *       - DateInterval representations and overlap/intersection math
 *       - Weekend calculation (`isDateInWeekend`, `dateIntervalOfWeekend`, `nextWeekend`)
 *       - Calendrical ordinality and date component diffing
 */

export interface DateInterval {
  start: Date;
  end: Date;
}

/**
 * Creates a DateInterval object from two dates or ISO strings.
 */
export function createDateInterval(start: Date | string, end: Date | string): DateInterval {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error(`Invalid date interval bounds: start=${start}, end=${end}`);
  }

  if (startDate > endDate) {
    return { start: endDate, end: startDate };
  }

  return { start: startDate, end: endDate };
}

/**
 * Calculates duration in milliseconds of a DateInterval.
 */
export function intervalDuration(interval: DateInterval): number {
  return interval.end.getTime() - interval.start.getTime();
}

/**
 * Checks if a date falls strictly or inclusively within a DateInterval.
 */
export function intervalContains(interval: DateInterval, date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const t = d.getTime();
  return t >= interval.start.getTime() && t <= interval.end.getTime();
}

/**
 * Checks if two DateIntervals overlap (Apple `DateInterval.intersects`).
 */
export function intervalsIntersect(a: DateInterval, b: DateInterval): boolean {
  return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
}

/**
 * Computes the overlapping DateInterval between two intervals (Apple `DateInterval.intersection`).
 * Returns null if they do not intersect.
 */
export function intervalIntersection(a: DateInterval, b: DateInterval): DateInterval | null {
  if (!intervalsIntersect(a, b)) return null;

  const start = a.start.getTime() > b.start.getTime() ? a.start : b.start;
  const end = a.end.getTime() < b.end.getTime() ? a.end : b.end;

  return { start, end };
}

/**
 * Returns true if a given date falls on a weekend (Saturday or Sunday).
 * (Apple `Calendar.isDateInWeekend`).
 */
export function isDateInWeekend(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDay();
  return day === 0 || day === 6; // Sunday=0, Saturday=6
}

/**
 * Returns the DateInterval of the weekend containing the given date.
 * (Apple `Calendar.dateIntervalOfWeekend`).
 */
export function dateIntervalOfWeekend(date: Date | string): DateInterval {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const day = d.getDay();

  // Calculate Saturday 00:00:00 as start of weekend
  const satOffset = day === 0 ? -1 : 6 - day;
  const sat = new Date(d.getFullYear(), d.getMonth(), d.getDate() + satOffset, 0, 0, 0, 0);

  // Calculate Sunday 23:59:59.999 as end of weekend
  const sun = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 1, 23, 59, 59, 999);

  return { start: sat, end: sun };
}

/**
 * Returns the DateInterval of the next weekend strictly after the given date.
 * (Apple `Calendar.nextWeekend`).
 */
export function nextWeekend(startingAfter: Date | string): DateInterval {
  const d = typeof startingAfter === 'string' ? new Date(startingAfter) : new Date(startingAfter);
  const nextSat = new Date(d);

  let daysToAdd = (6 - d.getDay() + 7) % 7;
  if (daysToAdd === 0) daysToAdd = 7;

  nextSat.setDate(d.getDate() + daysToAdd);
  nextSat.setHours(0, 0, 0, 0);

  const nextSunEnd = new Date(nextSat);
  nextSunEnd.setDate(nextSat.getDate() + 1);
  nextSunEnd.setHours(23, 59, 59, 999);

  return { start: nextSat, end: nextSunEnd };
}

/**
 * Calculates the ordinality of a smaller calendar component within a larger component.
 * (Apple `Calendar.ordinality(of:in:for:)`).
 * E.g., ordinality of weekday in month (e.g. 1st Monday, 3rd Tuesday of month).
 */
export function ordinalityInMonth(date: Date | string): { occurrenceInMonth: number; totalOccurrencesInMonth: number } {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const targetDayOfWeek = d.getDay();
  const dayOfMonth = d.getDate();

  const occurrenceInMonth = Math.ceil(dayOfMonth / 7);

  // Total occurrences of this weekday in the month
  const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= lastDayOfMonth; day++) {
    const cur = new Date(d.getFullYear(), d.getMonth(), day);
    if (cur.getDay() === targetDayOfWeek) count++;
  }

  return { occurrenceInMonth, totalOccurrencesInMonth: count };
}

/**
 * Calculates date component differences between two dates.
 * (Apple `Calendar.dateComponents(from:to:)`).
 */
export function dateComponentsDiff(from: Date | string, to: Date | string): {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
} {
  const fromDate = typeof from === 'string' ? new Date(from) : from;
  const toDate = typeof to === 'string' ? new Date(to) : to;

  const diffMs = toDate.getTime() - fromDate.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes, totalMinutes };
}
