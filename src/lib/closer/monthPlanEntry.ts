import { EMPTY_DAY, REFLECTION_MIN_CHARS, type DayActual } from './monthPlan';

export type NumericField = Exclude<keyof DayActual, 'reflection'>;
export type EntryDraft = Record<NumericField, string> & { reflection: string };

const MAX_MINUTES = 1440;
const MINUTE_FIELDS: NumericField[] = ['workMinutes', 'reflectionMinutes', 'learningMinutes'];

export function draftFromDay(day: DayActual | undefined): EntryDraft {
  const source = day ?? EMPTY_DAY;
  return {
    dials: String(source.dials),
    appointments: String(source.appointments),
    salesCalls: String(source.salesCalls),
    salesClosed: String(source.salesClosed),
    workMinutes: String(source.workMinutes),
    reflectionMinutes: String(source.reflectionMinutes),
    learningMinutes: String(source.learningMinutes),
    reflection: source.reflection,
  };
}

const toCount = (value: string) => (value.trim() === '' ? 0 : Number(value));

export function dayFromDraft(draft: EntryDraft): DayActual {
  return {
    dials: toCount(draft.dials),
    appointments: toCount(draft.appointments),
    salesCalls: toCount(draft.salesCalls),
    salesClosed: toCount(draft.salesClosed),
    workMinutes: toCount(draft.workMinutes),
    reflectionMinutes: toCount(draft.reflectionMinutes),
    learningMinutes: toCount(draft.learningMinutes),
    reflection: draft.reflection,
  };
}

/** Pierwszy błąd wpisu albo `null`; refleksja nie jest błędem, tylko warunkiem zamknięcia dnia. */
export function validateDay(day: DayActual): string | null {
  const numbers = Object.entries(day).filter(([key]) => key !== 'reflection').map(([, value]) => Number(value));
  if (!numbers.every((n) => Number.isInteger(n) && n >= 0)) return 'Wpisz liczby całe, od zera w górę.';
  if (MINUTE_FIELDS.some((key) => (day[key] as number) > MAX_MINUTES)) return 'Doba ma 1440 minut, wpisz mniej.';
  if (day.salesClosed > day.salesCalls) return 'Sprzedaży nie może być więcej niż sales calli.';
  return null;
}

/** Dzień jest zamknięty dopiero z refleksją o minimalnej długości. */
export const canCloseDay = (day: DayActual) => day.reflection.trim().length >= REFLECTION_MIN_CHARS;
