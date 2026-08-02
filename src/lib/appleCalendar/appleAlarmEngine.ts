/**
 * @module appleAlarmEngine
 * @role Implements Apple EventKit `EKAlarm` specifications:
 *       - Structured relative offset reminders (relativeOffsetMinutes)
 *       - Polish localized alarm labels and preset options
 *       - Upcoming alarm trigger calculations
 */

import type { CalRow } from '../../components/calendar/calendarHelpers';

export interface EKAlarmOption {
  minutes: number;
  label: string;
}

export const ALARM_OPTIONS: EKAlarmOption[] = [
  { minutes: -1, label: 'Brak przypomnienia' },
  { minutes: 0, label: 'W momencie wydarzenia' },
  { minutes: 5, label: '5 minut przed' },
  { minutes: 15, label: '15 minut przed' },
  { minutes: 30, label: '30 minut przed' },
  { minutes: 60, label: '1 godzina przed' },
  { minutes: 120, label: '2 godziny przed' },
  { minutes: 1440, label: '1 dzień przed' },
];

/**
 * Formats a reminder offset in minutes into a localized Polish label.
 */
export function formatAlarmLabel(reminderMinutes: number | null | undefined): string {
  if (reminderMinutes == null || reminderMinutes < 0) return 'Brak przypomnienia';
  const found = ALARM_OPTIONS.find((opt) => opt.minutes === reminderMinutes);
  if (found) return found.label;

  if (reminderMinutes < 60) return `${reminderMinutes} min przed`;
  if (reminderMinutes < 1440) return `${Math.round(reminderMinutes / 60)} godz. przed`;
  return `${Math.round(reminderMinutes / 1440)} dni przed`;
}

export interface UpcomingAlarm {
  eventId: string;
  summary: string;
  eventStartTime: string;
  alarmTime: Date;
  minutesBefore: number;
}

/**
 * Calculates upcoming event alarms due within a given lookahead window.
 */
export function getUpcomingAlarms(events: CalRow[], now: Date = new Date(), lookaheadMinutes: number = 60): UpcomingAlarm[] {
  const nowMs = now.getTime();
  const maxMs = nowMs + lookaheadMinutes * 60 * 1000;
  const upcoming: UpcomingAlarm[] = [];

  events.forEach((ev) => {
    if (!ev.start_time || ev.reminder_minutes == null || ev.reminder_minutes < 0) return;

    const startMs = new Date(ev.start_time.replace(' ', 'T')).getTime();
    if (isNaN(startMs)) return;

    const alarmMs = startMs - ev.reminder_minutes * 60 * 1000;

    if (alarmMs >= nowMs && alarmMs <= maxMs) {
      upcoming.push({
        eventId: ev.id,
        summary: ev.summary || 'Bez tytułu',
        eventStartTime: ev.start_time,
        alarmTime: new Date(alarmMs),
        minutesBefore: ev.reminder_minutes,
      });
    }
  });

  return upcoming;
}
