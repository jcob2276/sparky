import { describe, expect, it } from 'vitest';
import type { CaffeineEntry } from '../health/caffeineHistoryApi';
import type { Supplement, SupplementLog } from '../health/supplementsClient';
import { buildIntakeInsights, type IntakeNight } from './ouraIntakeInsights';

const supplement = (over: Partial<Supplement> = {}): Supplement => ({
  id: 's1', user_id: 'u', slug: 'mg', name: 'Magnez', emoji: '', unit: 'szt', dose_per_unit: {},
  sort_order: 1, active: true, start_date: null, end_date: null, reminder_time: '21:20:00',
  reminder_sent_date: null, skip_qty: false, created_at: '2026-09-01T00:00:00Z', ...over,
});

const log = (date: string, supplementId = 's1', hour = 21): SupplementLog => ({
  id: `${supplementId}-${date}`, user_id: 'u', supplement_id: supplementId, quantity: 1, date,
  logged_at: `${date}T${String(hour).padStart(2, '0')}:30:00+02:00`, note: null,
});

const day = (n: number) => `2026-09-${String(n).padStart(2, '0')}`;
const night = (date: string, score: number): IntakeNight => ({
  date, sleep_score: score, hrv_avg: score - 20, latency_minutes: 10,
});
const coffee = (date: string, hour: number): CaffeineEntry => ({
  date, name: 'Kawa', loggedAt: `${date}T${String(hour).padStart(2, '0')}:00:00+02:00`, mg: 95,
});

/** Noce 2..21 września. */
const nights = (score: (d: number) => number) =>
  Array.from({ length: 20 }, (_, i) => night(day(i + 2), score(i + 2)));

describe('buildIntakeInsights', () => {
  it('buduje stos suplementów na dziś z godziną zażycia i zaplanowaną', () => {
    const res = buildIntakeInsights({
      today: day(10), nights: [], caffeineEntries: [],
      supplements: [supplement(), supplement({ id: 's2', name: 'Cynk', reminder_time: null }), supplement({ id: 's3', active: false })],
      supplementLogs: [log(day(10))],
    });
    expect(res.todayStack).toEqual([
      { id: 's1', name: 'Magnez', taken: true, takenAt: '21:30', plannedAt: '21:20' },
      { id: 's2', name: 'Cynk', taken: false, takenAt: null, plannedAt: null },
    ]);
  });

  it('pomija suplementy poza zakresem start/end', () => {
    const res = buildIntakeInsights({
      today: day(10), nights: [], caffeineEntries: [], supplementLogs: [],
      supplements: [supplement({ end_date: day(5) }), supplement({ id: 's2', start_date: day(20) })],
    });
    expect(res.todayStack).toEqual([]);
  });

  it('zwraca "za mało danych" gdy którakolwiek strona ma <5 nocy', () => {
    const res = buildIntakeInsights({
      today: day(21), nights: nights(() => 80), caffeineEntries: [],
      supplements: [supplement()],
      supplementLogs: [day(3), day(4), day(5), day(6)].map((d) => log(d)),
    });
    expect(res.supplements[0].comparison).toEqual({ status: 'insufficient', nWith: 4, nWithout: 14 });
  });

  it('porównuje noc PO dniu z suplem z nocami po dniach bez (od pierwszego zażycia)', () => {
    // suple w dni 3..7 -> noce 4..8 (wynik 90); reszta 70
    const taken = [3, 4, 5, 6, 7];
    const res = buildIntakeInsights({
      today: day(21),
      nights: nights((d) => (taken.map((t) => t + 1).includes(d) ? 90 : 70)),
      caffeineEntries: [], supplements: [supplement()],
      supplementLogs: taken.map((d) => log(day(d))),
    });
    const cmp = res.supplements[0].comparison;
    expect(cmp.status).toBe('ok');
    if (cmp.status === 'ok') {
      expect(cmp.withGroup).toMatchObject({ n: 5, sleepScore: 90, hrv: 70 });
      expect(cmp.withoutGroup).toMatchObject({ n: 13, sleepScore: 70 });
    }
    expect(res.supplements[0].typicalTime).toBe('21:30');
  });

  it('nie zwraca porównania dla suplementu bez żadnych logów', () => {
    const res = buildIntakeInsights({
      today: day(21), nights: nights(() => 80), caffeineEntries: [], supplements: [supplement()], supplementLogs: [],
    });
    expect(res.supplements).toEqual([]);
  });

  it('kofeina: późna kawa (>=14:00) vs wcześnie, z progiem 5 nocy', () => {
    const lateDays = [2, 3, 4, 5, 6, 7];
    const earlyDays = [8, 9, 10, 11, 12, 13];
    const entries = [
      ...lateDays.map((d) => coffee(day(d), 16)),
      ...earlyDays.map((d) => coffee(day(d), 9)),
    ];
    const res = buildIntakeInsights({
      today: day(21),
      nights: nights((d) => (lateDays.map((x) => x + 1).includes(d) ? 65 : 80)),
      caffeineEntries: entries, supplements: [], supplementLogs: [],
    });
    const { comparison, daysWithTimedCaffeine } = res.caffeine;
    expect(daysWithTimedCaffeine).toBe(12);
    expect(comparison.status).toBe('ok');
    if (comparison.status === 'ok') {
      expect(comparison.withGroup.sleepScore).toBe(65);
      expect(comparison.withoutGroup.sleepScore).toBe(80);
    }
    expect(res.coffeeWindow.status).toBe('recommendation');
    if (res.coffeeWindow.status === 'recommendation') {
      expect(res.coffeeWindow.scoreGap).toBe(15);
      expect(res.coffeeWindow.beforeHour).toBeGreaterThanOrEqual(12);
      expect(res.coffeeWindow.beforeHour).toBeLessThanOrEqual(16);
    }
  });

  it('brak rekomendacji gdy kawa rzadko po południu (za mało danych)', () => {
    const entries = [2, 3, 4, 5, 6, 7, 8].map((d) => coffee(day(d), 9)).concat([coffee(day(9), 16)]);
    const res = buildIntakeInsights({
      today: day(21), nights: nights(() => 80), caffeineEntries: entries, supplements: [], supplementLogs: [],
    });
    expect(res.caffeine.comparison.status).toBe('insufficient');
    expect(res.coffeeWindow).toEqual({ status: 'insufficient' });
  });

  it('brak wyraźnej różnicy gdy obie grupy śpią tak samo', () => {
    const entries = [2, 3, 4, 5, 6, 7].map((d) => coffee(day(d), 16))
      .concat([8, 9, 10, 11, 12, 13].map((d) => coffee(day(d), 9)));
    const res = buildIntakeInsights({
      today: day(21), nights: nights(() => 80), caffeineEntries: entries, supplements: [], supplementLogs: [],
    });
    expect(res.coffeeWindow).toEqual({ status: 'no_effect' });
  });

  it('ignoruje wpisy kofeiny bez godziny i zwraca dzisiejsze godziny kawy', () => {
    const res = buildIntakeInsights({
      today: day(10), nights: [], supplements: [], supplementLogs: [],
      caffeineEntries: [
        { date: day(10), name: 'Kawa', loggedAt: null, mg: 95 },
        coffee(day(10), 8),
        coffee(day(10), 13),
        coffee(day(9), 15),
      ],
    });
    expect(res.todayCaffeineTimes).toEqual(['08:00', '13:00']);
    expect(res.caffeine.daysWithTimedCaffeine).toBe(2);
  });
});
