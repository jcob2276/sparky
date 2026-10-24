import type { DerivedObligation } from './terminyDerived';

type UpcomingLevel = 'soon' | 'heads-up';

interface UpcomingRow {
  row: DerivedObligation;
  level: UpcomingLevel;
}

const DEFAULT_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 45;
const SOON_DAYS = 7;
/** Dziś i jutro obsługuje czerwony baner, więc tu zaczynamy od drugiego dnia. */
const BANNER_DAYS = 1;

/** Okno „zbliża się” = najdalszy wcześniejszy termin przypomnienia z `lead_offsets` (np. -30), z górnym limitem. */
export function leadWindowDays(offsets: number[]): number {
  const earliest = offsets.filter((o) => o < 0).map((o) => Math.abs(o));
  return Math.min(MAX_WINDOW_DAYS, earliest.length ? Math.max(...earliest) : DEFAULT_WINDOW_DAYS);
}

/** Terminy, które weszły w okno przypomnień, ale jeszcze nie są pilne: widać je na Dziś, zanim zrobi się czerwono. */
export function upcomingRows(rows: DerivedObligation[]): UpcomingRow[] {
  return rows
    .filter((row) => row.daysLeft > BANNER_DAYS && row.daysLeft <= leadWindowDays(row.item.lead_offsets))
    .map((row) => ({ row, level: row.daysLeft <= SOON_DAYS ? ('soon' as const) : ('heads-up' as const) }));
}

/** Najbliższy termin poza oknem: spokojna wzmianka, żeby wiedzieć, co jest następne. */
export function nextQuietRow(rows: DerivedObligation[]): DerivedObligation | null {
  const inWindow = new Set(upcomingRows(rows).map((u) => u.row.item.id));
  return rows.find((row) => row.daysLeft > BANNER_DAYS && !inWindow.has(row.item.id)) ?? null;
}
