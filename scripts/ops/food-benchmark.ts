#!/usr/bin/env -S deno run --allow-read
/**
 * Raport dokładności parsera posiłków na własnym, ważonym zestawie.
 *
 * Wejście: plik JSON z tablicą przypadków `BenchmarkCase`
 *   { "id": "skyr-pol", "klass": "opakowanie",
 *     "reference":  { "calories": 190, "protein": 33, "carbs": 12, "fat": 1 },
 *     "prediction": { "calories": 205, "protein": 31, "carbs": 13, "fat": 2 },
 *     "interval":   { "min": 180, "max": 230 } }
 *
 * Użycie:
 *   deno run --allow-read scripts/ops/food-benchmark.ts cases.json
 *   deno run --allow-read scripts/ops/food-benchmark.ts baseline.json wariant.json   (sparowane porównanie po id)
 */
import { compareBenchmarks, scoreFoodBenchmark, type BenchmarkCase } from '../../packages/domain/src/health/foodBenchmark.ts';

async function load(path: string): Promise<BenchmarkCase[]> {
  const parsed: unknown = JSON.parse(await Deno.readTextFile(path));
  if (!Array.isArray(parsed)) throw new Error(`${path}: oczekiwano tablicy przypadków`);
  return parsed as BenchmarkCase[];
}

const [first, second] = Deno.args;
if (!first) {
  console.error('Użycie: food-benchmark.ts <przypadki.json> [wariant.json]');
  Deno.exit(1);
}

const baseline = await load(first);
console.log(JSON.stringify(scoreFoodBenchmark(baseline), null, 2));
if (second) {
  const variant = await load(second);
  console.log('\nWariant:');
  console.log(JSON.stringify(scoreFoodBenchmark(variant), null, 2));
  console.log('\nSparowane porównanie (dodatni zysk = wariant dokładniejszy):');
  console.log(JSON.stringify(compareBenchmarks(baseline, variant), null, 2));
}
