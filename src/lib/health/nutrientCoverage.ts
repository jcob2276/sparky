export interface NutrientCoverage {
  /** Suma znanych wartości (g). */
  total: number;
  /** Ile pozycji ma tę wartość zapisaną (NULL = brak danych, 0 się liczy). */
  known: number;
  items: number;
}

export interface DayNutrientCoverage {
  fiber: NutrientCoverage;
  saturatedFat: NutrientCoverage;
  /** Sól w gramach; opcjonalna, bo część widoków (tydzień) jeszcze jej nie pobiera. */
  salt?: NutrientCoverage;
}

interface EntryLike {
  fiber?: number | null;
  saturated_fat?: number | null;
  salt?: number | null;
}

function coverageOf(entries: EntryLike[], pick: (e: EntryLike) => number | null | undefined): NutrientCoverage {
  let total = 0;
  let known = 0;
  for (const entry of entries) {
    const value = pick(entry);
    if (value == null) continue;
    known += 1;
    total += Number(value);
  }
  return { total: Math.round(total * 10) / 10, known, items: entries.length };
}

/** Błonnik i nasycone z dnia razem z tym, ile pozycji faktycznie ma te dane (reszta to „nie wiadomo”, nie 0). */
export function computeDayNutrientCoverage(entries: EntryLike[]): DayNutrientCoverage {
  return {
    fiber: coverageOf(entries, (e) => e.fiber),
    saturatedFat: coverageOf(entries, (e) => e.saturated_fat),
    salt: coverageOf(entries, (e) => e.salt),
  };
}
