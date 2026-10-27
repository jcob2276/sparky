/**
 * @module foodBenchmark
 * @role Ocena dokładności parsera posiłków na ważonym zestawie własnych posiłków: błędy bezwzględne i
 *       podpisane, ogon błędów, rozbicie po klasach przypadków, pokrycie deklarowanego zakresu oraz
 *       sparowane porównanie dwóch wersji na tych samych wejściach.
 */

export const BENCHMARK_MACROS = ['calories', 'protein', 'carbs', 'fat'] as const;
export type BenchmarkMacro = (typeof BENCHMARK_MACROS)[number];
export type MacroValues = Record<BenchmarkMacro, number>;

export interface BenchmarkCase {
  id: string;
  /** Klasa przypadku, np. „opakowanie”, „domowy przepis”, „restauracja”; błędy raportujemy osobno per klasa. */
  klass: string;
  /** Wartości z ważenia / etykiety / przepisu (referencja, nie prawda laboratoryjna). */
  reference: MacroValues;
  prediction: MacroValues;
  /** Zakres kcal deklarowany przez parser; służy do pomiaru, czy mówi prawdę o własnej niepewności. */
  interval?: { min: number; max: number };
}

export interface MacroStats {
  n: number;
  /** Średni błąd bezwzględny (jednostka makra: kcal albo g). */
  mae: number;
  /** Średni błąd podpisany: dodatni = parser zawyża, ujemny = zaniża. */
  bias: number;
  median: number;
  p90: number;
  maxAbs: number;
}

export interface BenchmarkReport {
  n: number;
  byMacro: Record<BenchmarkMacro, MacroStats>;
  byClass: Record<string, { n: number; kcalMae: number; kcalBias: number }>;
  /** Odsetek przypadków, w których referencja mieści się w zakresie deklarowanym przez parser. */
  intervalCoverage: { n: number; hit: number; rate: number } | null;
  /** Największe pomyłki kcal; średnia kosztem rzadkich ogromnych błędów nie jest wygraną. */
  worst: Array<{ id: string; klass: string; kcalError: number }>;
}

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

function quantile(sortedAbs: number[], q: number): number {
  if (!sortedAbs.length) return 0;
  const position = (sortedAbs.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sortedAbs[lower] + (sortedAbs[upper] - sortedAbs[lower]) * (position - lower);
}

function macroStats(errors: number[]): MacroStats {
  const abs = errors.map(Math.abs).sort((a, b) => a - b);
  return {
    n: errors.length,
    mae: round(mean(abs)),
    bias: round(mean(errors)),
    median: round(quantile(abs, 0.5)),
    p90: round(quantile(abs, 0.9)),
    maxAbs: round(abs.at(-1) ?? 0),
  };
}

export function scoreFoodBenchmark(cases: BenchmarkCase[], worstCount = 5): BenchmarkReport {
  const errorsOf = (macro: BenchmarkMacro) => cases.map((c) => c.prediction[macro] - c.reference[macro]);
  const byMacro = Object.fromEntries(BENCHMARK_MACROS.map((macro) => [macro, macroStats(errorsOf(macro))])) as Record<BenchmarkMacro, MacroStats>;

  const classes = new Map<string, number[]>();
  for (const c of cases) classes.set(c.klass, [...(classes.get(c.klass) ?? []), c.prediction.calories - c.reference.calories]);
  const byClass = Object.fromEntries([...classes].map(([klass, errors]) => [klass, {
    n: errors.length,
    kcalMae: round(mean(errors.map(Math.abs))),
    kcalBias: round(mean(errors)),
  }]));

  const withInterval = cases.filter((c) => c.interval);
  const hit = withInterval.filter((c) => c.reference.calories >= c.interval!.min && c.reference.calories <= c.interval!.max).length;

  return {
    n: cases.length,
    byMacro,
    byClass,
    intervalCoverage: withInterval.length ? { n: withInterval.length, hit, rate: round(hit / withInterval.length, 3) } : null,
    worst: cases
      .map((c) => ({ id: c.id, klass: c.klass, kcalError: round(c.prediction.calories - c.reference.calories) }))
      .sort((a, b) => Math.abs(b.kcalError) - Math.abs(a.kcalError))
      .slice(0, worstCount),
  };
}

export interface PairedComparison {
  n: number;
  /** Średnia różnica |błąd A| − |błąd B| w kcal; dodatnia = wariant B jest dokładniejszy. */
  meanGainKcal: number;
  /** Przybliżony 95% przedział średniej różnicy (rozkład normalny; przy małym n tylko orientacyjny). */
  ci95: [number, number];
  betterB: number;
  betterA: number;
  ties: number;
}

/** Porównuje dwie wersje na tych samych przypadkach (po `id`); pomija przypadki obecne tylko w jednym zestawie. */
export function compareBenchmarks(a: BenchmarkCase[], b: BenchmarkCase[]): PairedComparison {
  const bById = new Map(b.map((c) => [c.id, c]));
  const diffs = a.flatMap((caseA) => {
    const caseB = bById.get(caseA.id);
    if (!caseB) return [];
    return [Math.abs(caseA.prediction.calories - caseA.reference.calories) - Math.abs(caseB.prediction.calories - caseB.reference.calories)];
  });
  const n = diffs.length;
  const m = mean(diffs);
  const variance = n > 1 ? diffs.reduce((sum, d) => sum + (d - m) ** 2, 0) / (n - 1) : 0;
  const margin = n > 1 ? 1.96 * Math.sqrt(variance / n) : 0;
  return {
    n,
    meanGainKcal: round(m),
    ci95: [round(m - margin), round(m + margin)],
    betterB: diffs.filter((d) => d > 0.5).length,
    betterA: diffs.filter((d) => d < -0.5).length,
    ties: diffs.filter((d) => Math.abs(d) <= 0.5).length,
  };
}
