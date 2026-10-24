import { shiftDateStr } from '../date';

export type BodyReminderKind = 'weight' | 'tape';
type BodyReminderState = 'ok' | 'due' | 'overdue';

export interface BodyReminder {
  kind: BodyReminderKind;
  state: BodyReminderState;
  lastDate: string | null;
  ageDays: number | null;
  everyDays: number;
}

export interface BodyReminderRow {
  date: string;
  weight: number | null;
  waist: number | null;
  neck: number | null;
  chest: number | null;
  belly: number | null;
  hips: number | null;
  thigh: number | null;
  biceps_l: number | null;
  calf: number | null;
}

const WEIGHT_EVERY_DAYS = 3;
const TAPE_EVERY_DAYS = 21;

/** Obwody poza talią: talia wpisuje się razem z wagą, więc nie liczy się do „reszty pomiarów”. */
const TAPE_FIELDS = ['neck', 'chest', 'belly', 'hips', 'thigh', 'biceps_l', 'calf'] as const;

const dayIndex = (date: string) => Math.round(new Date(`${date}T12:00:00Z`).getTime() / 86_400_000);
const has = (value: number | null) => value != null && Number.isFinite(value) && value > 0;

function latestDate(rows: BodyReminderRow[], hasValue: (row: BodyReminderRow) => boolean): string | null {
  return rows.reduce<string | null>((best, row) => (hasValue(row) && (best === null || row.date > best) ? row.date : best), null);
}

/**
 * Dzień interwału to spokojne przypomnienie („due”), a dopiero po jego przekroczeniu pomiar jest obowiązkowy („overdue”).
 * Brak jakiegokolwiek pomiaru też jest obowiązkiem.
 */
function reminder(kind: BodyReminderKind, lastDate: string | null, today: string, everyDays: number): BodyReminder {
  if (!lastDate) return { kind, state: 'overdue', lastDate, ageDays: null, everyDays };
  const ageDays = Math.max(0, dayIndex(today) - dayIndex(lastDate));
  const state: BodyReminderState = ageDays > everyDays ? 'overdue' : ageDays === everyDays ? 'due' : 'ok';
  return { kind, state, lastDate, ageDays, everyDays };
}

export function bodyReminders(rows: BodyReminderRow[], today: string): BodyReminder[] {
  return [
    reminder('weight', latestDate(rows, (r) => has(r.weight)), today, WEIGHT_EVERY_DAYS),
    reminder('tape', latestDate(rows, (r) => TAPE_FIELDS.some((f) => has(r[f]))), today, TAPE_EVERY_DAYS),
  ];
}

/** Kiedy kolejny pomiar przestaje być „w terminie”: ostatni dzień bez obowiązku. */
export function nextDueDate(reminderItem: BodyReminder): string | null {
  return reminderItem.lastDate ? shiftDateStr(reminderItem.lastDate, reminderItem.everyDays) : null;
}

export const isActionable = (item: BodyReminder): boolean => item.state !== 'ok';
