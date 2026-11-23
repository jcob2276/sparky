/**
 * Serie w pomiarach wstępnych wg trenera: od lekkiej rozgrzewki, przez 25%, 50% (2 serie), 75% (2 serie, mało powtórzeń)
 * i 90%, do 100% starego maksa. Pomiar ma być szacunkowy, więc to propozycja do edycji, nie przepis.
 */
export type SetRow = { kg: number | null; reps: number | null };

const numOrNull = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** Serie z bazy (jsonb) do listy z bezpiecznymi typami; śmieci dają null. */
export function parseSets(raw: unknown): SetRow[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.flatMap((row): SetRow[] => (row && typeof row === 'object' ? [{ kg: numOrNull((row as Record<string, unknown>).kg), reps: numOrNull((row as Record<string, unknown>).reps) }] : []));
}

const STEPS: Array<{ pct: number; reps: number }> = [
  { pct: 0, reps: 8 },
  { pct: 0.25, reps: 5 },
  { pct: 0.5, reps: 3 },
  { pct: 0.5, reps: 3 },
  { pct: 0.75, reps: 2 },
  { pct: 0.75, reps: 2 },
  { pct: 0.9, reps: 1 },
  { pct: 1, reps: 1 },
];

const round = (kg: number): number => Math.round(kg / 2.5) * 2.5;

/** Propozycja serii od starego maksa (kg dodatkowego ciężaru); null przy braku sensownej wartości. */
export function rampSets(oldMaxKg: number): SetRow[] | null {
  if (!Number.isFinite(oldMaxKg) || oldMaxKg <= 0 || oldMaxKg > 600) return null;
  return STEPS.map(({ pct, reps }) => ({ kg: round(oldMaxKg * pct), reps }));
}

const fmt = (n: number): string => String(Math.round(n * 10) / 10).replace('.', ',');

/** Skrót do pola „main_set” i wiadomości dla trenera, np. „0×8, 10×5, 20×3”. */
export function summarizeSets(sets: readonly SetRow[]): string {
  return sets.flatMap((s) => (s.reps != null && s.reps > 0 ? [`${fmt(s.kg ?? 0)}×${fmt(s.reps)}`] : [])).join(', ');
}

/** Najcięższa serie z co najmniej jednym powtórzeniem (podpowiedź dla pola „Mój max”). */
export function heaviestSetKg(sets: readonly SetRow[]): number | null {
  const weights = sets.flatMap((s) => (s.reps != null && s.reps > 0 && s.kg != null && s.kg > 0 ? [s.kg] : []));
  return weights.length ? Math.max(...weights) : null;
}
