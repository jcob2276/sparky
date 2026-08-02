/**
 * @module appleRecurrenceEngine
 * @role Implements Apple EventKit `EKRecurrenceRule` specifications:
 *       - Parsing and serializing RRULE strings compliant with iCalendar / EventKit
 *       - Expanding recurring event occurrences across arbitrary DateIntervals
 *       - Computing next occurrences for scheduling and alarms
 */

import { DateInterval, intervalsIntersect } from './appleDateInterval';
import type { CalRow } from '../../components/calendar/calendarHelpers';

export type EKRecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type EKWeekday = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

export interface EKRecurrenceEnd {
  type: 'never' | 'endDate' | 'occurrenceCount';
  endDate?: string; // YYYY-MM-DD
  occurrenceCount?: number;
}

export interface EKRecurrenceRule {
  frequency: EKRecurrenceFrequency;
  interval: number; // e.g. 1 (every week), 2 (every 2 weeks)
  daysOfWeek?: EKWeekday[];
  dayOfMonth?: number;
  end: EKRecurrenceEnd;
}

const WEEKDAY_INDEX_MAP: Record<EKWeekday, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

const INDEX_WEEKDAY_MAP: EKWeekday[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * Parses an iCalendar RRULE array (or string) into a structured EKRecurrenceRule.
 */
export function parseEKRecurrenceRule(rules: string[] | string | null | undefined): EKRecurrenceRule | null {
  if (!rules) return null;
  const rawRule = Array.isArray(rules)
    ? rules.find((r) => r.startsWith('RRULE:'))?.slice(6)
    : rules.startsWith('RRULE:') ? rules.slice(6) : rules;

  if (!rawRule) return null;

  const parts = Object.fromEntries(
    rawRule.split(';').map((p) => {
      const [k, v = ''] = p.split('=');
      return [k.toUpperCase(), v];
    }),
  );

  const freqStr = parts.FREQ;
  if (!freqStr) return null;

  const frequency: EKRecurrenceFrequency =
    freqStr === 'DAILY' ? 'daily'
    : freqStr === 'WEEKLY' ? 'weekly'
    : freqStr === 'MONTHLY' ? 'monthly'
    : freqStr === 'YEARLY' ? 'yearly'
    : 'weekly';

  const interval = Math.max(1, parseInt(parts.INTERVAL || '1', 10));
  const daysOfWeek = parts.BYDAY ? (parts.BYDAY.split(',').filter(Boolean) as EKWeekday[]) : undefined;
  const dayOfMonth = parts.BYMONTHDAY ? parseInt(parts.BYMONTHDAY, 10) : undefined;

  let end: EKRecurrenceEnd = { type: 'never' };
  if (parts.UNTIL) {
    const rawUntil = parts.UNTIL.slice(0, 8); // YYYYMMDD
    if (rawUntil.length === 8) {
      end = {
        type: 'endDate',
        endDate: `${rawUntil.slice(0, 4)}-${rawUntil.slice(4, 6)}-${rawUntil.slice(6, 8)}`,
      };
    }
  } else if (parts.COUNT) {
    end = {
      type: 'occurrenceCount',
      occurrenceCount: parseInt(parts.COUNT, 10),
    };
  }

  return {
    frequency,
    interval,
    daysOfWeek,
    dayOfMonth,
    end,
  };
}

/**
 * Serializes an EKRecurrenceRule into standard iCalendar RRULE format.
 */
export function formatEKRecurrenceRule(rule: EKRecurrenceRule): string {
  const parts: string[] = [`FREQ=${rule.frequency.toUpperCase()}`];

  if (rule.interval > 1) {
    parts.push(`INTERVAL=${rule.interval}`);
  }

  if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    parts.push(`BYDAY=${rule.daysOfWeek.join(',')}`);
  }

  if (rule.dayOfMonth) {
    parts.push(`BYMONTHDAY=${rule.dayOfMonth}`);
  }

  if (rule.end.type === 'endDate' && rule.end.endDate) {
    const formattedUntil = rule.end.endDate.replace(/-/g, '') + 'T235959Z';
    parts.push(`UNTIL=${formattedUntil}`);
  } else if (rule.end.type === 'occurrenceCount' && rule.end.occurrenceCount) {
    parts.push(`COUNT=${rule.end.occurrenceCount}`);
  }

  return `RRULE:${parts.join(';')}`;
}

/**
 * Helper to compute date string YYYY-MM-DD from Date.
 */
function toDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Expands a single event into recurring instances that overlap with the target DateInterval.
 */
export function expandOccurrences(event: CalRow, targetInterval: DateInterval): CalRow[] {
  if (!event.recurrence || event.recurrence.length === 0 || !event.start_time || !event.end_time) {
    return [event];
  }

  const rule = parseEKRecurrenceRule(event.recurrence);
  if (!rule) return [event];

  const baseStart = new Date(event.start_time.replace(' ', 'T'));
  const baseEnd = new Date(event.end_time.replace(' ', 'T'));
  const durationMs = baseEnd.getTime() - baseStart.getTime();

  const occurrences: CalRow[] = [];
  const baseId = event.series_id || event.id;

  // Search range: start 1 year back to targetInterval.end
  const cursor = new Date(baseStart);
  let count = 0;
  const maxIterations = 500;

  while (cursor <= targetInterval.end && count < maxIterations) {
    const cursorStr = toDateStr(cursor);

    // Check end conditions
    if (rule.end.type === 'endDate' && rule.end.endDate && cursorStr > rule.end.endDate) {
      break;
    }
    if (rule.end.type === 'occurrenceCount' && rule.end.occurrenceCount && count >= rule.end.occurrenceCount) {
      break;
    }

    // Check if cursor matches recurrence rule
    let matches = false;
    if (rule.frequency === 'daily') {
      matches = true;
    } else if (rule.frequency === 'weekly') {
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const curDay = INDEX_WEEKDAY_MAP[cursor.getDay()];
        matches = rule.daysOfWeek.includes(curDay);
      } else {
        matches = cursor.getDay() === baseStart.getDay();
      }
    } else if (rule.frequency === 'monthly') {
      matches = cursor.getDate() === (rule.dayOfMonth || baseStart.getDate());
    } else if (rule.frequency === 'yearly') {
      matches = cursor.getMonth() === baseStart.getMonth() && cursor.getDate() === baseStart.getDate();
    }

    if (matches) {
      count++;
      const instStart = new Date(cursor);
      instStart.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), baseStart.getMilliseconds());
      const instEnd = new Date(instStart.getTime() + durationMs);

      const instInterval: DateInterval = { start: instStart, end: instEnd };

      if (intervalsIntersect(instInterval, targetInterval)) {
        const timestampStr = instStart.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const instanceId = `${baseId}_${timestampStr}`;

        occurrences.push({
          ...event,
          id: instanceId,
          event_id: event.event_id || baseId,
          series_id: baseId,
          start_time: instStart.toISOString(),
          end_time: instEnd.toISOString(),
        });
      }
    }

    // Advance cursor by 1 day
    cursor.setDate(cursor.getDate() + 1);
  }

  return occurrences.length > 0 ? occurrences : [event];
}
