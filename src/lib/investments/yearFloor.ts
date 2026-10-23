import { getTodayWarsaw } from '../date';

/**
 * Retencja /inwestycje: baza trzyma tylko dane z bieżącego roku (1 stycznia – dziś),
 * bo nie ma miejsca na pełną historię. Każdy odczyt danych rynkowych ma używać tej podłogi.
 */
export function currentYear(today: string = getTodayWarsaw()): number {
  return Number(today.slice(0, 4));
}

/** Pierwszy dzień bieżącego roku (YYYY-01-01), strefa Europe/Warsaw. */
export function yearFloor(today: string = getTodayWarsaw()): string {
  return `${today.slice(0, 4)}-01-01`;
}

/** Późniejsza z dat: podłoga roku albo żądane `since` — zapytanie nigdy nie sięga przed 1 stycznia. */
export function clampToYearFloor(since: string, today: string = getTodayWarsaw()): string {
  const floor = yearFloor(today);
  return since < floor ? floor : since;
}
