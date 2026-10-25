import { HEALTH_THRESHOLDS } from '@vanguard/domain';

/** Ostrzeżenie o krótkim śnie. Bez statystyk „w X% przypadków”: żadne dane takiej liczby nie dostarczają. */
export function lowSleepNote(sleepHours: number | null | undefined): string | null {
  if (typeof sleepHours !== 'number' || sleepHours <= 0 || sleepHours >= HEALTH_THRESHOLDS.SLEEP_WARNING_H) return null;
  return `Sen ${sleepHours.toFixed(1)}h (< ${HEALTH_THRESHOLDS.SLEEP_WARNING_H}h): egzekucja zwykle słabsza, mniejsza kontrola impulsów.`;
}
