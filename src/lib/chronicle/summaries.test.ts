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

describe('głębsze porównanie okresów', () => {
  const prev = '2026-10-14';
  const now = '2026-10-20';

  it('Ciało: sen z jakością i HRV, jedzenie z kaloriami i jakością oraz bieganie w kilometrach, każde w swojej grupie', () => {
    const s = buildCialoSummary({
      weight: [], bodyFat: [], protein: [], workouts: [], latestBodyFat: null,
      sleepHours: [{ date: now, value: 7 }, { date: prev, value: 6 }],
      sleepScore: [{ date: now, value: 80 }, { date: prev, value: 70 }],
      hrv: [{ date: now, value: 60 }, { date: prev, value: 65 }],
      restingHr: [{ date: now, value: 52 }, { date: prev, value: 55 }],
      readiness: [{ date: now, value: 75 }],
      calories: [{ date: now, value: 2400 }, { date: prev, value: 2200 }],
      fiber: [{ date: now, value: 30 }],
      foodQuality: [{ date: now, value: 45 }, { date: prev, value: 40 }],
      runKm: [{ date: now, value: 10 }, { date: '2026-10-21', value: 5.5 }, { date: prev, value: 8 }],
    }, week);
    const by = Object.fromEntries(s.tiles.map((t) => [t.label, t]));
    expect(by['Jakość snu']).toMatchObject({ value: '80', delta: '+10', tone: 'good', group: 'Sen' });
    expect(by['HRV']).toMatchObject({ delta: '−5 ms', tone: 'bad' });
    expect(by['Tętno spoczynkowe']).toMatchObject({ delta: '−3 bpm', tone: 'good' });
    expect(by['Gotowość'].delta).toBeNull();
    expect(by['Kalorie / dzień']).toMatchObject({ value: '2400 kcal', delta: '+200 kcal', tone: 'neutral', group: 'Jedzenie' });
    expect(by['Jakość jedzenia'].group).toBe('Jedzenie');
    expect(by['Bieganie']).toMatchObject({ value: '15,5 km', delta: '+7,5 km', group: 'Trening' });
    expect(by['Waga'].group).toBe('Skład ciała');
  });

  it('Ciało bez nowych danych nie pokazuje wymyślonych zer', () => {
    const s = buildCialoSummary({ weight: [], bodyFat: [], protein: [], sleepHours: [], workouts: [], latestBodyFat: null }, week);
    expect(s.tiles.find((t) => t.label === 'HRV')?.value).toBe('—');
    expect(s.tiles.find((t) => t.label === 'Bieganie')).toBeUndefined();
  });

  it('Duch: ocena dnia, wpisy i dni z dziennikiem z Telegrama', () => {
    const s = buildDuchSummary({
      tasks: [], wins: [],
      dayScores: [{ date: now, value: 6 }, { date: '2026-10-21', value: 4 }, { date: prev, value: 5 }],
      journal: [{ date: now, value: 3 }, { date: '2026-10-21', value: 1 }, { date: prev, value: 2 }],
    }, week);
    const by = Object.fromEntries(s.tiles.map((t) => [t.label, t]));
    expect(by['Ocena dnia']).toMatchObject({ value: '5,0/10', delta: '±0,0/10', hint: 'z 2 dni', group: 'Oceny' });
    expect(by['Wpisy']).toMatchObject({ value: '4', delta: '+2', group: 'Dziennik z Telegrama' });
    expect(by['Dni z wpisem']).toMatchObject({ value: '2', hint: 'z 7' });
  });

  it('Konto: skuteczność liczona z rozmów, a bez rozmów to brak, nie 0%', () => {
    const logs = [
      { date: now, dials: 20, appointments: 4, sales_calls: 2, sales_closed: 1 },
      { date: prev, dials: 20, appointments: 2, sales_calls: 4, sales_closed: 1 },
    ];
    const by = Object.fromEntries(buildKontoSummary({ logs }, week, '2026-10-24').tiles.map((t) => [t.label, t]));
    expect(by['Z rozmowy na umówienie']).toMatchObject({ value: '20%', delta: '+10%', group: 'Skuteczność' });
    expect(by['Z rozmowy sprz. na sprzedaż']).toMatchObject({ value: '50%', delta: '+25%' });
    const empty = Object.fromEntries(buildKontoSummary({ logs: [] }, week, '2026-10-24').tiles.map((t) => [t.label, t]));
    expect(empty['Z rozmowy na umówienie'].value).toBe('—');
  });
});

