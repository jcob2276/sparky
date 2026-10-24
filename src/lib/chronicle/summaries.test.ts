import { describe, expect, it } from 'vitest';
import { buildPeriodWindow } from './periods';
import { buildCialoSummary, buildDuchSummary, buildKontoSummary } from './summaries';

const sprint = { sprintStart: '2026-09-13', sprintEnd: '2026-12-05', prevStart: '2026-06-21', prevEnd: '2026-09-12', sprintNumber: 3 };
const week = buildPeriodWindow('week', '2026-10-21', sprint);

describe('buildKontoSummary', () => {
  const logs = [
    { date: '2026-10-19', dials: 40, appointments: 4, sales_calls: 1, sales_closed: 0 },
    { date: '2026-10-12', dials: 30, appointments: 2, sales_calls: 1, sales_closed: 1 },
  ];

  it('sumuje lejek tygodnia i porównuje z poprzednim', () => {
    const s = buildKontoSummary({ logs }, week, '2026-10-21');
    const byLabel = Object.fromEntries(s.tiles.map((t) => [t.label, t]));
    expect(byLabel['Rozmowy odebrane'].value).toBe('40');
    expect(byLabel['Rozmowy odebrane'].delta).toBe('+10');
    expect(byLabel['Umówieni'].hint).toBe('z 30');
    expect(s.goalLine.pct).toBe(13);
  });

  it('zgłasza dni bez liczb (bez dzisiejszego)', () => {
    const s = buildKontoSummary({ logs }, week, '2026-10-21');
    expect(s.notes.join(' ')).toContain('Brak liczb z 1 dnia');
  });

  it('wykres zostawia dni bez danych jako przerwę', () => {
    const s = buildKontoSummary({ logs }, week, '2026-10-21');
    expect(s.chart.values).toEqual([4, null, null, null, null, null, null]);
  });
});

describe('buildCialoSummary', () => {
  it('bez pomiaru w okresie pokazuje ostatni znany tłuszcz z datą i nie porównuje', () => {
    const s = buildCialoSummary({
      weight: [{ date: '2026-10-21', value: 77.5 }],
      bodyFat: [],
      protein: [],
      sleepHours: [],
      workouts: [{ date: '2026-10-20', value: 1 }],
      latestBodyFat: { date: '2026-10-21', value: 21.2 },
    }, week);
    const fat = s.tiles.find((t) => t.label === 'Tłuszcz');
    expect(fat?.value).toBe('21,2%');
    expect(fat?.delta).toBeNull();
    expect(s.goalLine.hint).toContain('brakuje 6,2 pkt');
    expect(s.tiles.find((t) => t.label === 'Treningi')?.value).toBe('1');
  });
});

describe('buildDuchSummary', () => {
  it('liczy zwycięstwa w sferze Duch i nastrój tylko ze znanych dni', () => {
    const s = buildDuchSummary({
      tasks: [
        { date: '2026-10-20', done: true, category: 'duch' },
        { date: '2026-10-20', done: false, category: 'duch' },
        { date: '2026-10-21', done: true, category: 'konto' },
      ],
      wins: [
        { date: '2026-10-20', result: 'Z', mood: 4, hasNote: true },
        { date: '2026-10-21', result: null, mood: null, hasNote: false },
      ],
    }, week);
    expect(s.goalLine.pct).toBe(50);
    expect(s.tiles.find((t) => t.label === 'Nastrój')?.value).toBe('4,0');
    expect(s.tiles.find((t) => t.label === 'Pełne dni (5/5)')?.value).toBe('1');
  });
});
