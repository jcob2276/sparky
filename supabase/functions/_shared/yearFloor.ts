/**
 * Retencja /inwestycje po stronie ingestu: baza trzyma tylko dane od 1 stycznia bieżącego roku
 * (Europe/Warsaw). Lustro src/lib/investments/yearFloor.ts — backfill nie może wciągać starszych danych,
 * które prune_investments_before_year() i tak by usunęło.
 */
export function warsawToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Pierwszy dzień bieżącego roku (YYYY-01-01). */
export function yearFloor(today: string = warsawToday()): string {
  return `${today.slice(0, 4)}-01-01`;
}

/** 13F: okres baseline (31 grudnia poprzedniego roku) potrzebny do porównań Q-over-Q w bieżącym roku. */
export function sec13fPeriodFloor(today: string = warsawToday()): string {
  return `${Number(today.slice(0, 4)) - 1}-12-31`;
}

/** Zostawia tylko wiersze, których data (YYYY-MM-DD...) nie jest wcześniejsza niż podłoga; brak daty = zostaje. */
export function keepFromFloor<T>(rows: T[], dateOf: (row: T) => string | null | undefined, floor: string = yearFloor()): T[] {
  return rows.filter((row) => {
    const value = dateOf(row);
    return !value || value.slice(0, 10) >= floor;
  });
}
