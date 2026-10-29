import { getTodayWarsaw } from '../date';

/**
 * Clock time for a supplement log.
 * Today → now. Historical day without an explicit time → null (day known, time unknown; DC-11).
 */
export function supplementLoggedAtForDate(date: string, now = new Date()): string | null {
  if (date === getTodayWarsaw()) return now.toISOString();
  return null;
}
