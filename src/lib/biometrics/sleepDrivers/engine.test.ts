import { describe, expect, it } from 'vitest';
import { shiftDateStr } from '../../date';
import { computeSleepDrivers } from './engine';
import type { NightInput, SleepDriversInput } from './inputTypes';

const HOUR = 3_600_000;
const START = '2026-06-01';
const empty = (): SleepDriversInput => ({ nights: [], food: [], training: [], sauna: [], phone: [], pc: [], top5: [] });

function makeInput(count: number, gapFor: (i: number) => number, scoreFor: (i: number) => number): SleepDriversInput {
  const input = empty();
  for (let i = 0; i < count; i++) {
    const date = shiftDateStr(START, i);
    const bedMs = Date.parse(`${date}T21:00:00Z`);
    const night: NightInput = {
      date,
      bedtimeStart: new Date(bedMs).toISOString(),
      outcomes: { sleep_score: scoreFor(i), sleep_h: 6 + (i % 5) * 0.4, sleep_efficiency: null, deep_sleep_pct: null, sleep_hrv: null, sleep_latency_min: null },
    };
    input.nights.push(night);
    input.food.push({ name: 'Kawa', loggedAt: new Date(bedMs - gapFor(i) * HOUR).toISOString() });
    input.top5.push({ date, donePct: 20 + (i % 5) * 15 });
  }
  return input;
}

describe('computeSleepDrivers', () => {
  it('wykrywa mocny, monotoniczny efekt jako confirmed i opisuje go liczbą', () => {
    const result = computeSleepDrivers(makeInput(40, (i) => 4 + (i % 10), (i) => 60 + (i % 10) * 2));
    const effect = result.effects.find((e) => e.id === 'caffeine_gap_h:sleep_score');
    expect(effect?.strength).toBe('confirmed');
    expect(effect?.direction).toBe('helps');
    expect(effect?.n).toBe(40);
    expect(effect?.split?.thresholdLabel).toBe('Kawa 8 h przed snem');
    expect(effect?.headline).toMatch(/^Ostatnia kawa mniej niż 8 h przed snem: wynik snu −\d+(,\d+)? pkt\.$/);
    expect(result.effects[0].strength).toBe('confirmed');
    expect(result.nightsAnalyzed).toBe(40);
  });

  it('Top 5: sen na odsetek zadań, ze splitem po 7 h', () => {
    const result = computeSleepDrivers(makeInput(40, (i) => 4 + (i % 10), (i) => 60 + (i % 10) * 2));
    const sleepH = result.top5Effects.find((e) => e.predictor === 'sleep_h');
    expect(sleepH?.strength).toBe('confirmed');
    expect(sleepH?.split?.thresholdLabel).toBe('Sen 7 h');
    expect(sleepH?.headline).toMatch(/^Po śnie poniżej 7 h robisz o \d+ pp mniej z Top 5\.$/);
  });

  it('mała próba: brak efektu, ale n zostaje w coverage', () => {
    const result = computeSleepDrivers(makeInput(6, (i) => 4 + i, (i) => 60 + i * 3));
    expect(result.effects).toHaveLength(0);
    const caffeine = result.coverage.find((c) => c.driver === 'caffeine_gap_h');
    expect(caffeine?.n).toBe(6);
    expect(caffeine?.note).toMatch(/Za mało nocy/);
  });

  it('szum nie daje efektów confirmed ani probable', () => {
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const gaps = Array.from({ length: 40 }, () => 4 + rand() * 9);
    const scores = Array.from({ length: 40 }, () => 60 + rand() * 30);
    const result = computeSleepDrivers(makeInput(40, (i) => gaps[i], (i) => scores[i]));
    expect(result.effects.filter((e) => e.strength === 'confirmed' || e.strength === 'probable')).toHaveLength(0);
  });

  it('lastNight z zaokrąglonymi odstępami; telefon wieczorny bez danych jest nazwany wprost', () => {
    const result = computeSleepDrivers(makeInput(10, () => 9.26, () => 80));
    expect(result.lastNight?.date).toBe(shiftDateStr(START, 9));
    expect(result.lastNight?.caffeineGapH).toBe(9.3);
    expect(result.lastNight?.phoneEveningMin).toBeNull();
    const phone = result.coverage.find((c) => c.driver === 'phone_evening_min');
    expect(phone?.n).toBe(0);
    expect(phone?.note).toMatch(/Brak godzinowych danych telefonu/);
  });

  it('ActivityWatch starszy niż 14 dni od ostatniej nocy: stale i komunikat z datą', () => {
    const input = makeInput(40, (i) => 4 + (i % 10), (i) => 60 + (i % 10) * 2);
    input.pc = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({ date: shiftDateStr(START, i), activeH: 5 + (i % 3) }));
    const pc = computeSleepDrivers(input).coverage.find((c) => c.driver === 'pc_active_h');
    expect(pc?.stale).toBe(true);
    expect(pc?.note).toBe(`ActivityWatch nie synchronizuje się od ${shiftDateStr(START, 9)}.`);
  });

  it('puste wejście daje pusty wynik bez wyjątków', () => {
    const result = computeSleepDrivers(empty());
    expect(result).toMatchObject({ nightsAnalyzed: 0, effects: [], top5Effects: [], lastNight: null });
    expect(result.coverage).toHaveLength(7);
  });
});
