import { describe, expect, it } from 'vitest';
import { buildBeforeSleepFacts } from './ouraBeforeSleep';
import type { DayNightTimeline } from './ouraDayTimeline.types';

function timeline(overrides: Partial<DayNightTimeline> = {}): DayNightTimeline {
  return {
    nightDate: '2026-10-18',
    windowStart: '2026-10-17T04:00:00Z',
    windowEnd: '2026-10-18T06:36:00Z',
    sleepStart: '2026-10-17T23:03:00Z',
    sleepEnd: '2026-10-18T06:36:00Z',
    sleepSegments: [],
    hr: [],
    hrv: [],
    caffeineInBody: [],
    markers: [],
    summary: { lastCaffeineAt: null, totalCaffeineMg: 0, caffeineAtBedtimeMg: null, supplementsTaken: [], lastMealAt: null },
    ...overrides,
  };
}

describe('buildBeforeSleepFacts', () => {
  it('reports last meal, last workout and supplements with the gap before sleep', () => {
    const facts = buildBeforeSleepFacts(timeline({
      markers: [
        { id: 'w1', kind: 'workout', at: '2026-10-17T16:30:00Z', label: 'Kardio' },
        { id: 'w0', kind: 'workout', at: '2026-10-17T07:00:00Z', label: 'Spacer' },
      ],
      summary: { lastCaffeineAt: null, totalCaffeineMg: 0, caffeineAtBedtimeMg: null, supplementsTaken: ['Omega-3', 'Cynk'], lastMealAt: '2026-10-17T14:29:00Z' },
    }));
    expect(facts.find((f) => f.key === 'meal')).toMatchObject({ value: '16:29', hint: '8 h 34 min przed snem' });
    expect(facts.find((f) => f.key === 'workout')).toMatchObject({ value: 'Kardio · 18:30', hint: '6 h 33 min przed snem' });
    expect(facts.find((f) => f.key === 'supplements')?.value).toBe('Omega-3, Cynk');
  });

  it('says plainly when nothing was logged and skips the gap without a bedtime', () => {
    const facts = buildBeforeSleepFacts(timeline({ sleepStart: null, sleepEnd: null }));
    expect(facts.map((f) => f.value)).toEqual(['brak wpisu', 'nie zapisano', 'nie zaznaczono']);
    expect(facts.every((f) => f.hint === null)).toBe(true);
  });

  it('ignores workouts that happened after falling asleep', () => {
    const facts = buildBeforeSleepFacts(timeline({
      markers: [{ id: 'w', kind: 'workout', at: '2026-10-18T05:00:00Z', label: 'Poranny bieg' }],
    }));
    expect(facts.find((f) => f.key === 'workout')?.value).toBe('nie zapisano');
  });
});
