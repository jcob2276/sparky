import { bucketSeries, daysWithData, periodValue, type DatedValue } from './aggregate';
import type { PeriodWindow } from './periods';
import { CLOSER_WEEKLY_TARGETS } from '../closer/closerDayModel';
import { shiftDateStr } from '../date';
import { formatValue, makeTile, type ChronicleSummaryData } from './summaryTypes';

const GOAL_BF = 15;

export interface CialoRows {
  weight: DatedValue[];
  bodyFat: DatedValue[];
  protein: DatedValue[];
  sleepHours: DatedValue[];
  /** Jedna pozycja (value 1) na sesję treningową. */
  workouts: DatedValue[];
  latestBodyFat: { date: string; value: number } | null;
}

export interface DuchRows {
  tasks: Array<{ date: string; done: boolean; category: string | null }>;
  wins: Array<{ date: string; result: string | null; mood: number | null; hasNote: boolean }>;
}

export interface KontoRows {
  logs: Array<{ date: string; dials: number; appointments: number; sales_calls: number; sales_closed: number }>;
}

const countsAs = (rows: DatedValue[]) => rows.map((row) => ({ ...row, value: row.value == null ? null : 1 }));

export function buildCialoSummary(rows: CialoRows, win: PeriodWindow): ChronicleSummaryData {
  const { start, end, prevStart, prevEnd } = win;
  const weightNow = periodValue(rows.weight, start, end, 'last');
  const fatNow = periodValue(rows.bodyFat, start, end, 'last');
  const fatShown = fatNow ?? rows.latestBodyFat?.value ?? null;
  const fatPrev = periodValue(rows.bodyFat, prevStart, prevEnd, 'last');
  const fatFromHistory = fatNow == null && rows.latestBodyFat != null;
  const weightDays = daysWithData(rows.weight, start, end);
  const notes = [`Waga: ${weightDays} ${weightDays === 1 ? 'pomiar' : 'pomiarów'} w tym okresie.`];
  if (fatNow == null) notes.push('Tłuszcz bez pomiaru w tym okresie, pokazuję ostatni znany.');
  return {
    goalLine: {
      title: 'Ciało',
      pct: null,
      hint: fatShown == null
        ? 'Brak pomiaru tłuszczu. Cel: 15% BF i 100 kg w wyciskaniu.'
        : `Tłuszcz ${formatValue(fatShown, 1, '%')} → cel ${GOAL_BF}%: brakuje ${formatValue(Math.max(0, fatShown - GOAL_BF), 1)} pkt`,
    },
    tiles: [
      makeTile({ label: 'Waga', current: weightNow, previous: periodValue(rows.weight, prevStart, prevEnd, 'last'), digits: 1, unit: ' kg', higherIsBetter: null }),
      makeTile({
        label: 'Tłuszcz', current: fatShown, previous: fatFromHistory ? null : fatPrev, digits: 1, unit: '%', higherIsBetter: false,
        hint: fatFromHistory ? `pomiar z ${rows.latestBodyFat?.date}` : undefined,
      }),
      makeTile({ label: 'Białko / dzień', current: periodValue(rows.protein, start, end, 'avg'), previous: periodValue(rows.protein, prevStart, prevEnd, 'avg'), unit: ' g', higherIsBetter: true }),
      makeTile({ label: 'Sen', current: periodValue(rows.sleepHours, start, end, 'avg'), previous: periodValue(rows.sleepHours, prevStart, prevEnd, 'avg'), digits: 1, unit: ' h', higherIsBetter: true }),
      makeTile({ label: 'Treningi', current: periodValue(countsAs(rows.workouts), start, end, 'sum') ?? 0, previous: periodValue(countsAs(rows.workouts), prevStart, prevEnd, 'sum') ?? 0, higherIsBetter: true }),
    ],
    chart: { label: 'Waga (kg)', unit: 'kg', labels: win.buckets.map((b) => b.label), values: bucketSeries(rows.weight, win.buckets, 'last') },
    notes,
  };
}

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
      makeTile({ label: 'Sfera Duch', current: sphereNow.length ? sphereDone : null, previous: spherePrev.length ? spherePrev.filter((t) => t.done).length : null, higherIsBetter: true, hint: sphereNow.length ? `z ${sphereNow.length}` : undefined }),
      makeTile({ label: 'Wszystkie zwycięstwa', current: tasksNow.length ? done : null, previous: tasksPrev.length ? donePrev : null, higherIsBetter: true, hint: tasksNow.length ? `z ${tasksNow.length}` : undefined }),
      makeTile({ label: 'Pełne dni (5/5)', current: full(winsNow), previous: full(winsPrev), higherIsBetter: true }),
      makeTile({ label: 'Nastrój', current: mood(winsNow), previous: mood(winsPrev), digits: 1, higherIsBetter: true }),
    ],
    chart: { label: 'Zwycięstwa / dzień', unit: '', labels: win.buckets.map((b) => b.label), values: bucketSeries(doneByDay, win.buckets, 'sum') },
    notes: [
      'Cel „Głębokie relacje" nie ma jeszcze pomiaru, dlatego pokazuję zwycięstwa z Power List i nastrój.',
      'Zwycięstwa z podziałem na sfery są zapisywane od 5 lipca.',
    ],
  };
}

export function buildKontoSummary(rows: KontoRows, win: PeriodWindow, today: string): ChronicleSummaryData {
  const { start, end, prevStart, prevEnd } = win;
  const series = (pick: (log: KontoRows['logs'][number]) => number): DatedValue[] => rows.logs.map((log) => ({ date: log.date, value: pick(log) }));
  const dials = series((l) => l.dials);
  const booked = series((l) => l.appointments);
  const calls = series((l) => l.sales_calls);
  const sales = series((l) => l.sales_closed);
  const sum = (list: DatedValue[], a: string, b: string) => periodValue(list, a, b, 'sum');
  const targetBooked = Math.round(CLOSER_WEEKLY_TARGETS.appointments * win.weeks);
  const targetCalls = Math.round(CLOSER_WEEKLY_TARGETS.salesCalls * win.weeks);
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
      hint: `Umówieni ${bookedNow ?? 0} z ${targetBooked} · cel 15 000 zł netto / msc`,
    },
    tiles: [
      makeTile({ label: 'Rozmowy odebrane', current: sum(dials, start, end), previous: sum(dials, prevStart, prevEnd), higherIsBetter: true }),
      makeTile({ label: 'Umówieni', current: bookedNow, previous: sum(booked, prevStart, prevEnd), higherIsBetter: true, hint: `z ${targetBooked}` }),
      makeTile({ label: 'Rozmowy sprz.', current: sum(calls, start, end), previous: sum(calls, prevStart, prevEnd), higherIsBetter: true, hint: `z ${targetCalls}` }),
      makeTile({ label: 'Sprzedaże', current: sum(sales, start, end), previous: sum(sales, prevStart, prevEnd), higherIsBetter: true }),
    ],
    chart: { label: 'Umówieni', unit: '', labels: win.buckets.map((b) => b.label), values: bucketSeries(booked, win.buckets, 'sum') },
    notes,
  };
}
