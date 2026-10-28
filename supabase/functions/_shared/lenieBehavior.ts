/**
 * Lenie w analizach zachowań. Jedyne źródło zdarzenia to habit_logs (nawyk „Lenie”); behavior_log.walenie było kopią
 * i znika. Analizy, które liczą po kluczu zachowania, dostają Lenie jako wiersz o kluczu `walenie`.
 */
export const LENIE_BEHAVIOR_KEY = "walenie";

export interface BehaviorRow {
  date: string;
  behavior_key: string;
  value: number | null;
}

/** Dni z zaznaczonym nawykiem Lenie jako wiersze zachowania (wartość 1 za dzień). */
export function lenieAsBehaviorRows(
  rows: Array<{ date: string; completed?: boolean | null }> | null | undefined,
): BehaviorRow[] {
  return (rows ?? [])
    .filter((row) => row.completed !== false)
    .map((row) => ({ date: row.date, behavior_key: LENIE_BEHAVIOR_KEY, value: 1 }));
}
