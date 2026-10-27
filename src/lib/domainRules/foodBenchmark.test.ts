import { describe, expect, it } from 'vitest';
import { compareBenchmarks, scoreFoodBenchmark, type BenchmarkCase } from '@vanguard/domain';

const macros = (calories: number, protein = 10, carbs = 20, fat = 5) => ({ calories, protein, carbs, fat });
const item = (id: string, klass: string, ref: number, pred: number, interval?: { min: number; max: number }): BenchmarkCase => ({
  id, klass, reference: macros(ref), prediction: macros(pred), interval,
});

describe('scoreFoodBenchmark', () => {
  const cases = [
    item('a', 'opakowanie', 200, 210, { min: 190, max: 230 }),
    item('b', 'opakowanie', 300, 270, { min: 280, max: 320 }),
    item('c', 'domowy przepis', 500, 650, { min: 450, max: 560 }),
    item('d', 'domowy przepis', 400, 400),
  ];

  it('liczy MAE, błąd podpisany i ogon błędów', () => {
    const report = scoreFoodBenchmark(cases);
    expect(report.n).toBe(4);
    expect(report.byMacro.calories.mae).toBe(47.5); // (10 + 30 + 150 + 0) / 4
    expect(report.byMacro.calories.bias).toBe(32.5); // (10 - 30 + 150 + 0) / 4
    expect(report.byMacro.calories.maxAbs).toBe(150);
    expect(report.byMacro.protein.mae).toBe(0);
    expect(report.worst[0]).toEqual({ id: 'c', klass: 'domowy przepis', kcalError: 150 });
  });

  it('rozbija błąd po klasach przypadków', () => {
    const { byClass } = scoreFoodBenchmark(cases);
    expect(byClass.opakowanie).toEqual({ n: 2, kcalMae: 20, kcalBias: -10 });
    expect(byClass['domowy przepis']).toEqual({ n: 2, kcalMae: 75, kcalBias: 75 });
  });

  it('mierzy, czy deklarowany zakres mówi prawdę o niepewności', () => {
    // Referencja mieści się w zakresach a, b i c; przypadek d nie ma zakresu.
    expect(scoreFoodBenchmark(cases).intervalCoverage).toEqual({ n: 3, hit: 3, rate: 1 });
    const narrow = scoreFoodBenchmark([item('x', 'k', 500, 520, { min: 510, max: 530 })]);
    expect(narrow.intervalCoverage).toEqual({ n: 1, hit: 0, rate: 0 });
  });

  it('pusty zestaw nie psuje raportu', () => {
    const report = scoreFoodBenchmark([]);
    expect(report.n).toBe(0);
    expect(report.byMacro.calories.mae).toBe(0);
    expect(report.intervalCoverage).toBeNull();
  });
});

describe('compareBenchmarks', () => {
  it('porównuje dwie wersje parami po id i pomija przypadki bez pary', () => {
    const a = [item('1', 'k', 200, 260), item('2', 'k', 300, 300), item('3', 'k', 400, 380), item('only-a', 'k', 100, 100)];
    const b = [item('1', 'k', 200, 210), item('2', 'k', 300, 330), item('3', 'k', 400, 380)];
    const result = compareBenchmarks(a, b);
    expect(result.n).toBe(3);
    expect(result.betterB).toBe(1); // przypadek 1: błąd 60 → 10
    expect(result.betterA).toBe(1); // przypadek 2: błąd 0 → 30
    expect(result.ties).toBe(1); // przypadek 3: 20 → 20
    expect(result.meanGainKcal).toBeCloseTo((50 - 30 + 0) / 3, 1);
  });
});
