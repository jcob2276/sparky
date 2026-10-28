/**
 * Wybór wiersza Oury dla stanu świata. Wartości dnia pochodzą wyłącznie z dokładnej daty;
 * najnowszy wcześniejszy pomiar jest podawany osobno, z własną datą, i nigdy nie udaje stanu wskazanego dnia.
 */
export interface OuraDayRow {
  date: string;
  total_sleep_hours?: number | null;
  hrv_avg?: number | null;
  readiness_score?: number | null;
}

export interface LastAvailableBiometrics {
  date: string;
  sleep_hours: number | null;
  hrv_avg: number | null;
  readiness_score: number | null;
}

export function pickOuraRows<T extends { date: string }>(
  rows: T[] | null | undefined,
  date: string,
): { exact: T | null; latest: T | null } {
  const upToDate = (rows ?? []).filter((row) => row.date <= date).sort((a, b) => b.date.localeCompare(a.date));
  return { exact: upToDate.find((row) => row.date === date) ?? null, latest: upToDate[0] ?? null };
}

/** Wcześniejszy pomiar jako jawny fallback; null, gdy dzień ma własny pomiar albo nie ma wcześniejszego. */
export function lastAvailableBiometrics(
  exact: OuraDayRow | null,
  latest: OuraDayRow | null,
): LastAvailableBiometrics | null {
  if (exact || !latest) return null;
  return {
    date: latest.date,
    sleep_hours: latest.total_sleep_hours ?? null,
    hrv_avg: latest.hrv_avg ?? null,
    readiness_score: latest.readiness_score ?? null,
  };
}
