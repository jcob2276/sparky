import { shiftDateStr } from '../../date';
import { DRIVER_IDS } from './meta';
import type { NightRecord } from './inputTypes';
import type { DriverCoverage, DriverId } from './types';

const STALE_DAYS = 14;
/** Poniżej tylu nocy nie pokazujemy żadnego efektu (patrz classifyEvidence). */
const MIN_NIGHTS_NOTE = 8;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

function noteFor(driver: DriverId, n: number, firstDate: string | null, lastDate: string | null, stale: boolean): string | null {
  if (n === 0) {
    return driver === 'phone_evening_min'
      ? 'Brak godzinowych danych telefonu: zbieranie zaczęło się dopiero po aktualizacji aplikacji.'
      : 'Brak danych dla tego czynnika.';
  }
  if (stale && lastDate) {
    const lastSource = driver === 'pc_active_h' ? shiftDateStr(lastDate, -1) : lastDate;
    return driver === 'pc_active_h'
      ? `ActivityWatch nie synchronizuje się od ${lastSource}.`
      : `Ostatnie dane z ${lastSource}, nowsze nie dochodzą.`;
  }
  if (driver === 'phone_evening_min' && firstDate) {
    return `Telefon po 21:30 zbieramy od ${firstDate}; wcześniejszej historii nie da się odtworzyć.`;
  }
  if (n < MIN_NIGHTS_NOTE) return `Za mało nocy (${n}), żeby cokolwiek wnioskować.`;
  return null;
}

export function buildCoverage(nights: NightRecord[]): DriverCoverage[] {
  const lastNight = nights.reduce<string | null>((max, n) => (max == null || n.date > max ? n.date : max), null);
  return DRIVER_IDS.map((driver) => {
    const dates = nights.filter((n) => n.drivers[driver] != null).map((n) => n.date).sort();
    const firstDate = dates[0] ?? null;
    const lastDate = dates.at(-1) ?? null;
    const stale = lastDate != null && lastNight != null && daysBetween(lastDate, lastNight) > STALE_DAYS;
    return { driver, n: dates.length, firstDate, lastDate, stale, note: noteFor(driver, dates.length, firstDate, lastDate, stale) };
  });
}
