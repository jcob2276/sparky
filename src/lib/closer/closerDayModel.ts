import type { CloserDailyLogRow } from './closerApi';

/** Cele tygodniowe sprzedaży (te same, co w CloserWeekTracker). */
export const CLOSER_WEEKLY_TARGETS = { appointments: 30, salesCalls: 10 } as const;

const MAX_COUNT = 999;

/** Stan formularza: puste pole = jeszcze nie wpisane (nie to samo co 0). */
export interface DayNumbersDraft {
  appointments: string;
  conversations: string;
  salesCalls: string;
  /** Dzień bez sprzedaży: wszystkie liczby = 0, nic do wpisywania. */
  off: boolean;
  note: string;
}

/**
 * Liczby dnia w kolumnach `closer_daily_logs`: „rozmowy” to kolumna `dials`
 * (rozmowy telefoniczne), „sales calle” to `sales_calls`, „umówieni” to `appointments`.
 */
export interface DayNumbers {
  appointments: number;
  dials: number;
  salesCalls: number;
  note: string | null;
}

export const EMPTY_DRAFT: DayNumbersDraft = {
  appointments: '',
  conversations: '',
  salesCalls: '',
  off: false,
  note: '',
};

/** Tylko cyfry, bez znaków i spacji; puste lub niepoprawne = null. */
export function parseCount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value <= MAX_COUNT ? value : null;
}

/** Zostawia w polu wyłącznie cyfry (max 3), żeby nie dało się wpisać nonsensu. */
export function sanitizeCountInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 3);
}

export function draftToNumbers(draft: DayNumbersDraft): DayNumbers | null {
  const note = draft.note.trim() || null;
  if (draft.off) return { appointments: 0, dials: 0, salesCalls: 0, note };
  const appointments = parseCount(draft.appointments);
  const dials = parseCount(draft.conversations);
  const salesCalls = parseCount(draft.salesCalls);
  if (appointments == null || dials == null || salesCalls == null) return null;
  return { appointments, dials, salesCalls, note };
}

export function isDraftComplete(draft: DayNumbersDraft): boolean {
  return draftToNumbers(draft) !== null;
}

/** Wiersz istnieje w bazie, ale może być zerowym szkieletem z samych godzin pracy. */
export function hasEnteredNumbers(row: CloserDailyLogRow | null | undefined): boolean {
  if (!row) return false;
  return (row.appointments ?? 0) + (row.dials ?? 0) + (row.sales_calls ?? 0) > 0 || Boolean(row.notes?.trim());
}

export function rowToDraft(row: CloserDailyLogRow | null | undefined): DayNumbersDraft {
  if (!row || !hasEnteredNumbers(row)) return EMPTY_DRAFT;
  return {
    appointments: String(row.appointments ?? 0),
    conversations: String(row.dials ?? 0),
    salesCalls: String(row.sales_calls ?? 0),
    off: false,
    note: row.notes ?? '',
  };
}

export interface WeekPace {
  remaining: number;
  daysLeft: number;
  /** Ile dziennie trzeba do końca tygodnia, zaokrąglone w górę. */
  perDay: number;
}

/** Dni od `dayIso` do niedzieli włącznie (poniedziałek = 7, niedziela = 1). */
export function daysLeftInWeek(dayIso: string): number {
  const weekday = new Date(`${dayIso}T12:00:00Z`).getUTCDay();
  return weekday === 0 ? 1 : 8 - weekday;
}

export function weekPace(sumSoFar: number, target: number, dayIso: string): WeekPace {
  const remaining = Math.max(0, target - sumSoFar);
  const daysLeft = daysLeftInWeek(dayIso);
  return { remaining, daysLeft, perDay: remaining === 0 ? 0 : Math.ceil(remaining / daysLeft) };
}

export interface WeekSums {
  appointments: number;
  salesCalls: number;
  dials: number;
}

export function sumWeek(rows: CloserDailyLogRow[]): WeekSums {
  return rows.reduce<WeekSums>(
    (acc, row) => ({
      appointments: acc.appointments + (row.appointments ?? 0),
      salesCalls: acc.salesCalls + (row.sales_calls ?? 0),
      dials: acc.dials + (row.dials ?? 0),
    }),
    { appointments: 0, salesCalls: 0, dials: 0 },
  );
}
