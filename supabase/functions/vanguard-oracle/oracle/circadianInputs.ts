import { getWarsawClockMinutes, shiftDateStr } from "../../_shared/time.ts";

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
const asNumber = (value: unknown): number | undefined => (typeof value === "number" ? value : undefined);

export interface CircadianInputs {
  readinessScore?: number;
  sleepHours?: number;
}

/**
 * Wejścia rytmu dobowego z faktycznego kontraktu WorldState.biometrics (płaskie readiness_score i sleep_hours).
 * Gdy dzień nie ma własnego pomiaru, wolno użyć last_available tylko z poprzedniej nocy (data >= dzień stanu minus 1).
 */
export function circadianInputs(stateVector: unknown): CircadianInputs {
  const state = asRecord(stateVector);
  const biometrics = asRecord(state?.biometrics);
  const readinessScore = asNumber(biometrics?.readiness_score);
  const sleepHours = asNumber(biometrics?.sleep_hours);
  if (readinessScore !== undefined || sleepHours !== undefined) return { readinessScore, sleepHours };

  const last = asRecord(biometrics?.last_available);
  const stateDate = typeof state?.date === "string" ? state.date : undefined;
  if (last && typeof last.date === "string" && stateDate && last.date >= shiftDateStr(stateDate, -1)) {
    return { readinessScore: asNumber(last.readiness_score), sleepHours: asNumber(last.sleep_hours) };
  }
  return {};
}

/** Godzina w Warszawie (0-23); dla odtworzeń historycznych (override_date) stałe południe, jak w localTimeString. */
export function warsawHourFor(now: Date, overrideDate?: unknown): number {
  return overrideDate ? 12 : Math.floor(getWarsawClockMinutes(now) / 60);
}
