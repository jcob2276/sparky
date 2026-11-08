import { shiftDateStr } from '../date.ts';

/**
 * Planowanie pobierania starszej historii konta bankowego w małych, zapisywanych oknach.
 * Okna idą od najnowszych do najstarszych, a kursor (`history_cursor`) przesuwa się wstecz po każdym
 * zapisanym oknie. Limit odczytów banku w środku nie niszczy więc postępu, a kolejna próba zaczyna od kursora.
 */

/** Najgłębsza historia, o jaką prosimy (bank oddaje ok. 1450 dni; starsze zapytania kończą się błędem banku). */
export const HISTORY_DAYS = 1400;
/** Szerokość jednego okna. Okno = kilka stron odczytu, mieści się w dobowym limicie. */
export const HISTORY_WINDOW_DAYS = 90;
/** Ile pustych okien z rzędu uznajemy za dowód, że starszych danych nie ma. */
export const HISTORY_EMPTY_WINDOWS_TO_STOP = 4;

export interface HistoryWindow { from: string; to: string }

export interface HistoryPosition {
  historyCursor: string | null;
  transactionsFrom: string | null;
  /** Najstarsza zapisana data księgowania na koncie. */
  oldestStored: string | null;
}

const earliest = (dates: Array<string | null>): string | null => {
  const present = dates.filter((d): d is string => Boolean(d));
  return present.length ? present.reduce((a, b) => (a < b ? a : b)) : null;
};

/** Data, od której kontynuujemy: najwcześniejsza znana granica pobranych danych. */
export function historyCursor(pos: HistoryPosition, today: string, recentDays: number): string {
  return earliest([pos.historyCursor, pos.transactionsFrom, pos.oldestStored]) ?? shiftDateStr(today, -recentDays);
}

export function historyFloor(today: string): string {
  return shiftDateStr(today, -HISTORY_DAYS);
}

/** Następne okno wstecz od kursora albo null, gdy dotarliśmy do dna. Okna zachodzą na siebie o jeden dzień (brak dziur). */
export function nextHistoryWindow(cursor: string, floor: string): HistoryWindow | null {
  if (cursor <= floor) return null;
  const from = shiftDateStr(cursor, -HISTORY_WINDOW_DAYS);
  return { from: from < floor ? floor : from, to: cursor };
}

/**
 * Dalsze okna nie mają sensu: kursor jest dalej od najstarszej zapisanej transakcji niż kilka pustych okien,
 * czyli konto nie ma starszej historii (albo bank jej nie oddaje).
 */
export function isHistoryExhausted(cursor: string, oldestStored: string | null): boolean {
  if (!oldestStored) return false;
  return cursor <= shiftDateStr(oldestStored, -HISTORY_EMPTY_WINDOWS_TO_STOP * HISTORY_WINDOW_DAYS);
}
