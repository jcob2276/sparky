import { describe, expect, it } from 'vitest';
import type { NightInput, SleepDriversInput } from './inputTypes';
import { buildNightRecord, indexInputs } from './nightFeatures';

const OUTCOMES: NightInput['outcomes'] = {
  sleep_score: 80, sleep_h: 7, sleep_efficiency: 90, deep_sleep_pct: 18, sleep_hrv: 40, sleep_latency_min: 10,
};
const base: SleepDriversInput = { nights: [], food: [], training: [], sauna: [], phone: [], pc: [], top5: [], weather: [] };
const night = (date: string, bedtimeStart: string | null): NightInput => ({ date, bedtimeStart, outcomes: OUTCOMES });
const span = (startIso: string, endIso: string) => ({ startMs: Date.parse(startIso), endMs: Date.parse(endIso) });

describe('buildNightRecord', () => {
  it('liczy odstępy i godziny lokalne przez północ (zima, CET)', () => {
    const input: SleepDriversInput = {
      ...base,
      food: [
        { name: 'Kawa z mlekiem', loggedAt: '2026-12-09T11:00:00Z' },
        { name: 'Kolacja', loggedAt: '2026-12-09T20:30:00Z' },
      ],
      training: [span('2026-12-09T17:00:00Z', '2026-12-09T18:30:00Z')],
    };
    // zaśnięcie 00:30 lokalnie 10.12 (= 23:30Z 9.12)
    const rec = buildNightRecord(night('2026-12-10', '2026-12-09T23:30:00Z'), indexInputs(input));
    expect(rec.bedtimeAt).toBe('00:30');
    expect(rec.drivers.caffeine_gap_h).toBeCloseTo(12.5);
    expect(rec.clock.caffeineLastAt).toBe('12:00');
    expect(rec.drivers.meal_gap_h).toBeCloseTo(3);
    expect(rec.clock.mealLastAt).toBe('21:30');
    expect(rec.drivers.training_gap_h).toBeCloseTo(5);
    expect(rec.clock.trainingAt).toBe('19:30');
    expect(rec.drivers.sauna_gap_h).toBeNull();
  });

  it('noc ze zmianą czasu 2026-10-25: odstęp w czasie bezwzględnym, godzina lokalna', () => {
    const input: SleepDriversInput = {
      ...base,
      training: [span('2026-10-24T18:00:00Z', '2026-10-24T19:00:00Z')], // 21:00 CEST
    };
    // 02:30 CET (po cofnięciu zegara) = 01:30Z => 6.5 h bezwzględnie (nie 5.5 h ścienne)
    const rec = buildNightRecord(night('2026-10-25', '2026-10-25T01:30:00Z'), indexInputs(input));
    expect(rec.bedtimeAt).toBe('02:30');
    expect(rec.drivers.training_gap_h).toBeCloseTo(6.5);
    expect(rec.clock.trainingAt).toBe('21:00');
  });

  it('ignoruje zdarzenia po zaśnięciu i starsze niż 24 h', () => {
    const input: SleepDriversInput = {
      ...base,
      food: [
        { name: 'Espresso', loggedAt: '2026-12-10T05:00:00Z' },
        { name: 'Kawa', loggedAt: '2026-12-08T10:00:00Z' },
      ],
    };
    const rec = buildNightRecord(night('2026-12-10', '2026-12-09T23:30:00Z'), indexInputs(input));
    expect(rec.drivers.caffeine_gap_h).toBeNull();
    expect(rec.drivers.meal_gap_h).toBeNull();
  });

  it('jedzenie bez kofeiny nie jest kawą, ale jest posiłkiem', () => {
    const input: SleepDriversInput = { ...base, food: [{ name: 'Kurczak z ryżem', loggedAt: '2026-12-09T19:30:00Z' }] };
    const rec = buildNightRecord(night('2026-12-10', '2026-12-09T23:30:00Z'), indexInputs(input));
    expect(rec.drivers.caffeine_gap_h).toBeNull();
    expect(rec.drivers.meal_gap_h).toBeCloseTo(4);
  });

  it('brak bedtime => brak predyktorów czasowych; telefon dzienny i komputer z D-1', () => {
    const input: SleepDriversInput = {
      ...base,
      food: [{ name: 'Kawa', loggedAt: '2026-12-09T11:00:00Z' }],
      phone: [{ date: '2026-12-09', totalMin: 300, buckets: null }],
      pc: [{ date: '2026-12-09', activeH: 6.5 }],
    };
    const rec = buildNightRecord(night('2026-12-10', null), indexInputs(input));
    expect(rec.bedtimeAt).toBeNull();
    expect(rec.drivers.caffeine_gap_h).toBeNull();
    expect(rec.drivers.phone_evening_min).toBeNull();
    expect(rec.drivers.phone_total_min).toBe(300);
    expect(rec.drivers.pc_active_h).toBe(6.5);
  });
});
