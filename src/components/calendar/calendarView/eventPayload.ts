import type { CalendarEvent } from '../../../lib/calendarApi';
import { addDays, getWarsawOffset } from '../calendarHelpers';

const pad = (n: number) => String(n).padStart(2, '0');

interface EventTimesInput {
  date: string; // YYYY-MM-DD
  startMin: number;
  durationMin: number;
  allDay: boolean;
}

export function buildEventTimes({ date, startMin, durationMin, allDay }: EventTimesInput): { start: string; end: string } {
  if (allDay) {
    const endDate = addDays(date, 1);
    return {
      start: `${date}T00:00:00${getWarsawOffset(date)}`,
      end: `${endDate}T00:00:00${getWarsawOffset(endDate)}`,
    };
  }
  const [y, m, d] = date.split('-');
  const endMin = startMin + durationMin;
  const endDate = addDays(date, Math.floor(endMin / (24 * 60)));
  const normalizedEndMin = endMin % (24 * 60);
  return {
    start: `${y}-${m}-${d}T${pad(Math.floor(startMin / 60))}:${pad(startMin % 60)}:00${getWarsawOffset(date)}`,
    end: `${endDate}T${pad(Math.floor(normalizedEndMin / 60))}:${pad(normalizedEndMin % 60)}:00${getWarsawOffset(endDate)}`,
  };
}

interface CommonPayloadInput {
  title: string;
  category: string | null;
  description: string;
  location: string;
  allDay: boolean;
  reminderMinutes: number | null;
  recurrence: string[] | null;
}

export interface QuickEventPayloadInput extends CommonPayloadInput {
  date: string;
  startMin: number;
  durationMin: number;
}

export function buildQuickEventPayload(input: QuickEventPayloadInput): Omit<CalendarEvent, 'id'> {
  const { start, end } = buildEventTimes(input);
  return {
    summary: input.title,
    start,
    end,
    category: input.category || undefined,
    description: input.description.trim() || undefined,
    location: input.location.trim() || undefined,
    is_all_day: input.allDay,
    reminder_minutes: input.reminderMinutes,
    recurrence: input.recurrence ?? null,
  };
}

export interface EditEventPayloadInput extends CommonPayloadInput {
  id: string;
  date: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export function buildEditEventPayload(input: EditEventPayloadInput): CalendarEvent & { id: string } {
  let endDateStr = input.date;
  if (input.allDay) {
    // Wydarzenie całodniowe: [00:00, następny dzień 00:00) — koniec ekskluzywny.
    endDateStr = addDays(input.date, 1);
  } else if (input.end < input.start) {
    endDateStr = addDays(input.date, 1);
  }
  const start = input.allDay
    ? `${input.date}T00:00:00${getWarsawOffset(input.date)}`
    : `${input.date}T${input.start}:00${getWarsawOffset(input.date)}`;
  const end = input.allDay
    ? `${endDateStr}T00:00:00${getWarsawOffset(endDateStr)}`
    : `${endDateStr}T${input.end}:00${getWarsawOffset(endDateStr)}`;
  return {
    id: input.id,
    summary: input.title.trim(),
    start,
    end,
    category: input.category || undefined,
    description: input.description.trim() || undefined,
    location: input.location.trim() || undefined,
    is_all_day: input.allDay,
    reminder_minutes: input.reminderMinutes,
    recurrence: input.recurrence ?? null,
  };
}
