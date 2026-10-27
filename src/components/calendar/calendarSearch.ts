/**
 * @module calendarSearch
 * @role Wybór wyników wyszukiwania wydarzeń: te same pola co filtr siatki (tytuł, sfera, opis, miejsce),
 *          ale z listą do skoku: najbliższe nadchodzące najpierw, potem minione od najświeższych.
 */
import { dateOfISO, type CalRow } from './calendarHelpers';
import { filterDisplayEvents } from './hooks/calendarDataHelpers';

export const SEARCH_MIN_CHARS = 2;
/** Okno szukania wokół dzisiaj (dni w każdą stronę), niezależne od widocznego miesiąca. */
export const SEARCH_WINDOW_DAYS = 180;
export const SEARCH_RESULT_LIMIT = 8;

export function pickSearchResults(rows: CalRow[], query: string, today: string, limit = SEARCH_RESULT_LIMIT): CalRow[] {
  const term = query.trim();
  if (term.length < SEARCH_MIN_CHARS) return [];

  const seen = new Set<string>();
  const matches: CalRow[] = [];
  for (const row of filterDisplayEvents(rows, new Set(), term)) {
    if (!row.start_time || seen.has(row.id)) continue;
    seen.add(row.id);
    matches.push(row);
  }

  const startOf = (row: CalRow) => row.start_time ?? '';
  const upcoming = matches.filter((row) => dateOfISO(startOf(row)) >= today).sort((a, b) => startOf(a).localeCompare(startOf(b)));
  const past = matches.filter((row) => dateOfISO(startOf(row)) < today).sort((a, b) => startOf(b).localeCompare(startOf(a)));
  return [...upcoming, ...past].slice(0, limit);
}
