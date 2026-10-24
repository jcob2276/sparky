import { bucketSeries, daysWithData, periodValue, type DatedValue } from './aggregate';
import type { PeriodWindow } from './periods';
import { DEFAULT_CLOSER_TARGETS, type CloserWeeklyTargets } from '../closer/closerDayModel';
import { shiftDateStr } from '../date';
import { formatValue, makeTile, type ChronicleSummaryData } from './summaryTypes';
import { DEFAULT_LIFE_TARGETS, incomeLabel, type LifeTargets } from '../lifeGoals';


export interface CialoRows {
  weight: DatedValue[];
  bodyFat: DatedValue[];
  protein: DatedValue[];
  sleepHours: DatedValue[];
  /** Jedna pozycja (value 1) na sesję treningową. */
  workouts: DatedValue[];
  latestBodyFat: { date: string; value: number } | null;
  sleepScore?: DatedValue[];
  hrv?: DatedValue[];
  restingHr?: DatedValue[];
  readiness?: DatedValue[];
  calories?: DatedValue[];
  fiber?: DatedValue[];
  foodQuality?: DatedValue[];
  /** Kilometry biegania danego dnia. */
  runKm?: DatedValue[];
}

export interface DuchRows {
  tasks: Array<{ date: string; done: boolean; category: string | null }>;
  wins: Array<{ date: string; result: string | null; mood: number | null; hasNote: boolean }>;
  /** Własna ocena dnia 1–10 z domknięcia dnia. */
  dayScores?: DatedValue[];
  /** Liczba wpisów z dziennika głosowego (Telegram) danego dnia. */
  journal?: DatedValue[];
}

export interface KontoRows {
  logs: Array<{ date: string; dials: number; appointments: number; sales_calls: number; sales_closed: number }>;
}

const countsAs = (rows: DatedValue[]) => rows.map((row) => ({ ...row, value: row.value == null ? null : 1 }));

const avgOf = (rows: DatedValue[] | undefined, a: string, b: string) => periodValue(rows ?? [], a, b, 'avg');

/** Sen: godziny i to, jak się po nim regenerujesz. Brak pomiaru w okresie to „—”, nie zero. */
function cialoSleepTiles(rows: CialoRows, win: PeriodWindow) {
  const { start, end, prevStart, prevEnd } = win;
  const tile = (label: string, data: DatedValue[] | undefined, higherIsBetter: boolean, digits = 0, unit = '') =>
    makeTile({ group: 'Sen', label, current: avgOf(data, start, end), previous: avgOf(data, prevStart, prevEnd), digits, unit, higherIsBetter });
  return [
    tile('Sen', rows.sleepHours, true, 1, ' h'),
    tile('Jakość snu', rows.sleepScore, true),
    tile('HRV', rows.hrv, true, 0, ' ms'),
    tile('Tętno spoczynkowe', rows.restingHr, false, 0, ' bpm'),
    tile('Gotowość', rows.readiness, true),
  ];
}

/** Jedzenie liczy tylko dni z zapisem; kalorie nie mają kierunku „lepiej”, bo cel zależy od fazy. */
function cialoFoodTiles(rows: CialoRows, win: PeriodWindow) {
  const { start, end, prevStart, prevEnd } = win;
  const tile = (label: string, data: DatedValue[] | undefined, higherIsBetter: boolean | null, digits = 0, unit = '') =>
    makeTile({ group: 'Jedzenie', label, current: avgOf(data, start, end), previous: avgOf(data, prevStart, prevEnd), digits, unit, higherIsBetter });
  return [
    tile('Kalorie / dzień', rows.calories, null, 0, ' kcal'),
    tile('Białko / dzień', rows.protein, true, 0, ' g'),
    { ...tile('Błonnik / dzień', rows.fiber, true, 0, ' g'), hint: 'min.' },
    tile('Jakość jedzenia', rows.foodQuality, true),
  ];
}

export function buildCialoSummary(rows: CialoRows, win: PeriodWindow, targets: LifeTargets = DEFAULT_LIFE_TARGETS): ChronicleSummaryData {
  const { start, end, prevStart, prevEnd } = win;
  const weightNow = periodValue(rows.weight, start, end, 'last');
  const fatNow = periodValue(rows.bodyFat, start, end, 'last');
  const fatShown = fatNow ?? rows.latestBodyFat?.value ?? null;
  const fatPrev = periodValue(rows.bodyFat, prevStart, prevEnd, 'last');
  const fatFromHistory = fatNow == null && rows.latestBodyFat != null;
  const weightDays = daysWithData(rows.weight, start, end);
  const notes = [`Waga: ${weightDays} ${weightDays === 1 ? 'pomiar' : 'pomiarów'} w tym okresie.`, 'Jedzenie liczone z pełnych dni (bez dzisiejszego); błonnik to dolna granica, bo nie każdy produkt ma go w bazie.'];
  if (fatNow == null) notes.push('Tłuszcz bez pomiaru w tym okresie, pokazuję ostatni znany.');
  return {
    goalLine: {
      title: 'Ciało',
      pct: null,
      hint: fatShown == null
        ? `Brak pomiaru tłuszczu. Cel: ${targets.bodyFatPct}% BF i ${targets.benchKg} kg w wyciskaniu.`
        : `Tłuszcz ${formatValue(fatShown, 1, '%')} → cel ${targets.bodyFatPct}%: brakuje ${formatValue(Math.max(0, fatShown - targets.bodyFatPct), 1)} pkt`,
    },
    tiles: [
      ...cialoSleepTiles(rows, win),
      ...cialoFoodTiles(rows, win),
      makeTile({ group: 'Trening', label: 'Treningi', current: periodValue(countsAs(rows.workouts), start, end, 'sum') ?? 0, previous: periodValue(countsAs(rows.workouts), prevStart, prevEnd, 'sum') ?? 0, higherIsBetter: true }),
      ...(rows.runKm ? [makeTile({ group: 'Trening', label: 'Bieganie', current: periodValue(rows.runKm, start, end, 'sum'), previous: periodValue(rows.runKm, prevStart, prevEnd, 'sum'), digits: 1, unit: ' km', higherIsBetter: true })] : []),
      makeTile({ group: 'Skład ciała', label: 'Waga', current: weightNow, previous: periodValue(rows.weight, prevStart, prevEnd, 'last'), digits: 1, unit: ' kg', higherIsBetter: null }),
      makeTile({
        group: 'Skład ciała', label: 'Tłuszcz', current: fatShown, previous: fatFromHistory ? null : fatPrev, digits: 1, unit: '%', higherIsBetter: false,
        hint: fatFromHistory ? `pomiar z ${rows.latestBodyFat?.date}` : undefined,
      }),
    ],
    chart: { label: 'Waga (kg)', unit: 'kg', labels: win.buckets.map((b) => b.label), values: bucketSeries(rows.weight, win.buckets, 'last') },
    notes,
  };
}

const daysIn = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000) + 1;

export function buildDuchSummary(rows: DuchRows, win: PeriodWindow): ChronicleSummaryData {
  const { start, end, prevStart, prevEnd } = win;
  const inWin = (date: string, a: string, b: string) => date >= a && date <= b;
  const tasksNow = rows.tasks.filter((t) => inWin(t.date, start, end));
  const tasksPrev = rows.tasks.filter((t) => inWin(t.date, prevStart, prevEnd));
  const done = tasksNow.filter((t) => t.done).length;
  const donePrev = tasksPrev.filter((t) => t.done).length;
  const winsNow = rows.wins.filter((w) => inWin(w.date, start, end));
  const winsPrev = rows.wins.filter((w) => inWin(w.date, prevStart, prevEnd));
  const full = (list: DuchRows['wins']) => list.filter((w) => w.result === 'Z').length;
  const mood = (list: DuchRows['wins']) => periodValue(list.map((w) => ({ date: w.date, value: w.mood })), '0000-01-01', '9999-12-31', 'avg');
  const sphere = (list: DuchRows['tasks']) => list.filter((t) => t.category === 'duch');
  const sphereNow = sphere(tasksNow);
  const spherePrev = sphere(tasksPrev);
  const sphereDone = sphereNow.filter((t) => t.done).length;
  const doneByDay: DatedValue[] = Array.from(
    tasksNow.filter((t) => t.done).reduce((map, t) => map.set(t.date, (map.get(t.date) ?? 0) + 1), new Map<string, number>()),
    ([date, value]) => ({ date, value }),
  );
  return {
    goalLine: {
      title: 'Duch',
      pct: sphereNow.length ? Math.round((sphereDone / sphereNow.length) * 100) : null,
      hint: sphereNow.length ? `Zwycięstwa w sferze Duch: ${sphereDone} z ${sphereNow.length}` : 'Brak zwycięstw w sferze Duch w tym okresie',
    },
    tiles: [
      makeTile({ group: 'Oceny', label: 'Ocena dnia', current: avgOf(rows.dayScores, start, end), previous: avgOf(rows.dayScores, prevStart, prevEnd), digits: 1, unit: '/10', higherIsBetter: true, hint: rows.dayScores ? `z ${daysWithData(rows.dayScores, start, end)} dni` : undefined }),
      makeTile({ group: 'Zwycięstwa', label: 'Sfera Duch', current: sphereNow.length ? sphereDone : null, previous: spherePrev.length ? spherePrev.filter((t) => t.done).length : null, higherIsBetter: true, hint: sphereNow.length ? `z ${sphereNow.length}` : undefined }),
      makeTile({ group: 'Zwycięstwa', label: 'Wszystkie zwycięstwa', current: tasksNow.length ? done : null, previous: tasksPrev.length ? donePrev : null, higherIsBetter: true, hint: tasksNow.length ? `z ${tasksNow.length}` : undefined }),
      makeTile({ group: 'Zwycięstwa', label: 'Pełne dni (5/5)', current: full(winsNow), previous: full(winsPrev), higherIsBetter: true }),
      makeTile({ group: 'Zwycięstwa', label: 'Nastrój', current: mood(winsNow), previous: mood(winsPrev), digits: 1, higherIsBetter: true }),
      ...(rows.journal ? [
        makeTile({ group: 'Dziennik z Telegrama', label: 'Wpisy', current: periodValue(rows.journal, start, end, 'sum') ?? 0, previous: periodValue(rows.journal, prevStart, prevEnd, 'sum') ?? 0, higherIsBetter: true }),
        makeTile({ group: 'Dziennik z Telegrama', label: 'Dni z wpisem', current: daysWithData(rows.journal, start, end), previous: daysWithData(rows.journal, prevStart, prevEnd), higherIsBetter: true, hint: `z ${daysIn(start, end)}` }),
      ] : []),
    ],
    chart: { label: 'Zwycięstwa / dzień', unit: '', labels: win.buckets.map((b) => b.label), values: bucketSeries(doneByDay, win.buckets, 'sum') },
    notes: [
      'Cel „Głębokie relacje" nie ma jeszcze pomiaru, dlatego pokazuję zwycięstwa z Power List i nastrój.',
      'Zwycięstwa z podziałem na sfery są zapisywane od 5 lipca.',
    ],
  };
}

/** Procent z części i całości; bez całości nie ma skuteczności (null), a nie 0%. */
function rate(part: number | null, whole: number | null): number | null {
  return part == null || whole == null || whole <= 0 ? null : Math.round((part / whole) * 100);
}

export function buildKontoSummary(rows: KontoRows, win: PeriodWindow, today: string, targets: LifeTargets = DEFAULT_LIFE_TARGETS, closerTargets: CloserWeeklyTargets = DEFAULT_CLOSER_TARGETS): ChronicleSummaryData {
  const { start, end, prevStart, prevEnd } = win;
  const series = (pick: (log: KontoRows['logs'][number]) => number): DatedValue[] => rows.logs.map((log) => ({ date: log.date, value: pick(log) }));
  const dials = series((l) => l.dials);
  const booked = series((l) => l.appointments);
  const calls = series((l) => l.sales_calls);
  const sales = series((l) => l.sales_closed);
  const sum = (list: DatedValue[], a: string, b: string) => periodValue(list, a, b, 'sum');
  const targetBooked = Math.round(closerTargets.appointments * win.weeks);
  const targetCalls = Math.round(closerTargets.salesCalls * win.weeks);
  const bookedNow = sum(booked, start, end);
  const entered = series((l) => l.dials + l.appointments + l.sales_calls + l.sales_closed).filter((r) => (r.value ?? 0) > 0);
  const yesterday = shiftDateStr(today, -1);
  const lastDay = end < yesterday ? end : yesterday;
  const daysCounted = lastDay < start ? 0 : Math.round((new Date(`${lastDay}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86400000) + 1;
  const missing = daysCounted - (daysCounted > 0 ? daysWithData(entered, start, lastDay) : 0);
  const dialsNow = sum(dials, start, end) ?? 0;
  const notes = [dialsNow > 0 && bookedNow != null ? `Z rozmowy odebranej na umówienie ${Math.round((bookedNow / dialsNow) * 1000) / 10}%.` : 'Brak rozmów odebranych w tym okresie.'];
  if (missing > 0) notes.push(`Brak liczb z ${missing} ${missing === 1 ? 'dnia' : 'dni'} (bez dzisiejszego): sumy są zaniżone.`);
  return {
    goalLine: {
      title: 'Konto',
      pct: bookedNow == null || targetBooked === 0 ? null : Math.min(100, Math.round((bookedNow / targetBooked) * 100)),
      hint: `Umówieni ${bookedNow ?? 0} z ${targetBooked} · cel ${incomeLabel(targets)}`,
    },
    tiles: [
      makeTile({ group: 'Lejek', label: 'Rozmowy odebrane', current: sum(dials, start, end), previous: sum(dials, prevStart, prevEnd), higherIsBetter: true }),
      makeTile({ group: 'Lejek', label: 'Umówieni', current: bookedNow, previous: sum(booked, prevStart, prevEnd), higherIsBetter: true, hint: `z ${targetBooked}` }),
      makeTile({ group: 'Lejek', label: 'Rozmowy sprz.', current: sum(calls, start, end), previous: sum(calls, prevStart, prevEnd), higherIsBetter: true, hint: `z ${targetCalls}` }),
      makeTile({ group: 'Lejek', label: 'Sprzedaże', current: sum(sales, start, end), previous: sum(sales, prevStart, prevEnd), higherIsBetter: true }),
      makeTile({ group: 'Skuteczność', label: 'Z rozmowy na umówienie', current: rate(bookedNow, dialsNow), previous: rate(sum(booked, prevStart, prevEnd), sum(dials, prevStart, prevEnd)), unit: '%', higherIsBetter: true }),
      makeTile({ group: 'Skuteczność', label: 'Z rozmowy sprz. na sprzedaż', current: rate(sum(sales, start, end), sum(calls, start, end)), previous: rate(sum(sales, prevStart, prevEnd), sum(calls, prevStart, prevEnd)), unit: '%', higherIsBetter: true }),
    ],
    chart: { label: 'Umówieni', unit: '', labels: win.buckets.map((b) => b.label), values: bucketSeries(booked, win.buckets, 'sum') },
    notes,
  };
}
