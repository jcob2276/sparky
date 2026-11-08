import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { computeReadiness, type ReadinessDay } from './readiness.ts';
import { sleepDebtAt, sleepDebtExcess } from './sleepDebt.ts';

const dayStr = (i: number) => new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10);

/** 30 stabilnych dni z lekkim, deterministycznym szumem i dzisiejszym dniem na końcu. */
function series(today: Partial<ReadinessDay>): ReadinessDay[] {
  const days: ReadinessDay[] = Array.from({ length: 30 }, (_, i) => ({
    date: dayStr(i),
    hrv: 55 + (i % 5) - 2,
    rhr: 52 + (i % 3) - 1,
    respRate: 15 + (i % 2) * 0.2,
    strain: 8 + (i % 4),
  }));
  days.push({ date: dayStr(30), hrv: 55, rhr: 52, respRate: 15, strain: 9, ...today });
  return days;
}
const TODAY = dayStr(30);

Deno.test('zwykły dzień to normalny dzień', () => {
  assertEquals(computeReadiness(series({}), TODAY).level, 'balanced');
});

Deno.test('jedna wartość tuż za progiem nie zmienia werdyktu', () => {
  const slightlyLow = computeReadiness(series({ hrv: 51.5 }), TODAY, { hrvZ: -0.9 });
  assertEquals(slightlyLow.level, 'balanced');
});

Deno.test('jeden umiarkowanie słaby sygnał to jeszcze nie „dziś lżej”, ale kilka umiarkowanych już tak', () => {
  const one = computeReadiness(series({}), TODAY, { hrvZ: -1.2 });
  assertEquals(one.level, 'balanced');
  const several = computeReadiness(series({}), TODAY, { hrvZ: -1.2, rhrZ: -1.0, sleepScoreZ: -1.0, sleepDebtExcessH: 2.5 });
  assertEquals(several.level, 'strained');
});

Deno.test('wyraźny spadek wszystkiego to odpoczynek', () => {
  const r = computeReadiness(series({}), TODAY, { hrvZ: -2.2, rhrZ: -2.0, sleepScoreZ: -1.8, sleepDebtExcessH: 4 });
  assertEquals(r.level, 'rundown');
});

Deno.test('dobre sygnały bez ostrzeżeń dają gotowość na mocny dzień', () => {
  const r = computeReadiness(series({}), TODAY, { hrvZ: 1.0, rhrZ: 0.8, sleepScoreZ: 0.6, sleepDebtExcessH: 0 });
  assertEquals(r.level, 'primed');
});

Deno.test('jedno ostrzeżenie blokuje „gotowy na mocny dzień”', () => {
  const r = computeReadiness(series({}), TODAY, { hrvZ: 1.0, rhrZ: 0.8, sleepScoreZ: -0.9 });
  assertEquals(r.level, 'balanced');
});

Deno.test('przy braku baselines z zewnątrz używa 30 dni i podłogi rozrzutu', () => {
  const flat = Array.from({ length: 30 }, (_, i) => ({ date: dayStr(i), hrv: 55, rhr: 52, respRate: 15, strain: 9 }));
  flat.push({ date: TODAY, hrv: 54.5, rhr: 52, respRate: 15, strain: 9 });
  assertEquals(computeReadiness(flat, TODAY).level, 'balanced');
});

Deno.test('bez żadnych danych wynik to insufficient', () => {
  assertEquals(computeReadiness([], TODAY).level, 'insufficient');
});

Deno.test('dług snu: przewlekły niedosyt nie jest „nadwyżką”', () => {
  const sleep: Record<string, number> = {};
  for (let i = 0; i <= 40; i++) sleep[dayStr(i)] = 6.5;
  assertEquals(sleepDebtAt(sleep, dayStr(40))! < -5, true);
  assertEquals(Math.abs(sleepDebtExcess(sleep, dayStr(40))!) <= 0.2, true);
});

Deno.test('dług snu: nagłe pogorszenie daje dodatnią nadwyżkę', () => {
  const sleep: Record<string, number> = {};
  for (let i = 0; i <= 40; i++) sleep[dayStr(i)] = i >= 37 ? 4.5 : 7.5;
  assertEquals(sleepDebtExcess(sleep, dayStr(40))! > 3, true);
});

Deno.test('dług snu: za mało nocy to null', () => {
  assertEquals(sleepDebtAt({ [dayStr(0)]: 7 }, dayStr(0)), null);
});
