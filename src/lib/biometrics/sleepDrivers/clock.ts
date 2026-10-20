import { formatWarsawDate, warsawTimeOfDay } from '../../date';

export const HOUR_MS = 3_600_000;

/** Lokalne (Europe/Warsaw) „HH:mm” dla chwili w ms. */
export function localHHmm(ms: number): string {
  return warsawTimeOfDay(new Date(ms).toISOString());
}

/** Minuty od lokalnej północy (Europe/Warsaw) dla chwili w ms. */
export function localMinutesOfDay(ms: number): number {
  const [h, m] = localHHmm(ms).split(':').map(Number);
  return (h % 24) * 60 + m;
}

/** Klucz dnia kalendarzowego Europe/Warsaw (nigdy slice(0,10) z UTC). */
export function localDay(ms: number): string {
  return formatWarsawDate(ms);
}

export function parseMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}
