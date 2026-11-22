import type { Pillar, ReviewDay, ReviewTaskItem } from './reviewCycle.types';

const WEEKDAY_SHORT = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];

export function weekdayShort(date: string): string {
  return WEEKDAY_SHORT[new Date(`${date}T12:00:00Z`).getUTCDay()] ?? '';
}

/** Dzień z najwyższą i najniższą oceną; przy remisie decyduje więcej domkniętych zadań. */
export function bestAndWorstDay(days: ReviewDay[]): { best: ReviewDay | null; worst: ReviewDay | null } {
  const rated = days.filter((d) => d.score != null);
  if (rated.length < 2) return { best: rated[0] ?? null, worst: null };
  const sorted = [...rated].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.tasksDone - a.tasksDone);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  return { best, worst: worst.score === best.score ? null : worst };
}

export interface Correlation {
  /** Krótka etykieta warunku, np. „Sen ≥ 7 h”. */
  label: string;
  withAvg: number;
  withoutAvg: number;
}

const avg = (values: number[]) => Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;

function split(days: ReviewDay[], label: string, test: (d: ReviewDay) => boolean | null): Correlation | null {
  const yes: number[] = [];
  const no: number[] = [];
  for (const d of days) {
    if (d.score == null) continue;
    const result = test(d);
    if (result == null) continue;
    (result ? yes : no).push(d.score);
  }
  if (yes.length < 2 || no.length < 2) return null;
  const withAvg = avg(yes);
  const withoutAvg = avg(no);
  return Math.abs(withAvg - withoutAvg) >= 1 ? { label, withAvg, withoutAvg } : null;
}

/**
 * Proste porównania ocen dnia: tylko gdy po obu stronach są co najmniej 2 dni i różnica to minimum punkt.
 * Bez statystyki udającej naukę: to podpowiedź do refleksji, nie dowód.
 */
export function dayCorrelations(days: ReviewDay[]): Correlation[] {
  return [
    split(days, 'Zaśnięcie przed 23:30', (d) => (d.bedtimeMinutes == null ? null : d.bedtimeMinutes < 23 * 60 + 30)),
    split(days, 'Sen ≥ 7 h', (d) => (d.sleepHours == null ? null : d.sleepHours >= 7)),
    split(days, 'Plan 3+ zadań domknięty', (d) => (d.tasksTotal === 0 ? null : d.tasksDone >= 3)),
    split(days, 'Telefon < 3 h', (d) => (d.phoneMinutes == null ? null : d.phoneMinutes < 180)),
    split(days, 'Notatka dnia', (d) => d.hasNote),
  ]
    .filter((c): c is Correlation => c !== null)
    .sort((a, b) => Math.abs(b.withAvg - b.withoutAvg) - Math.abs(a.withAvg - a.withoutAvg))
    .slice(0, 3);
}

const PILLAR_KEYS: Pillar[] = ['cialo', 'duch', 'konto'];

/** Zadania, które wracały w planie i ani razu nie zostały zrobione: najmocniejszy sygnał unikania. */
export function recurringMissed(tasks: { done: ReviewTaskItem[]; missed: ReviewTaskItem[] }, limit = 3) {
  const doneTitles = new Set(tasks.done.map((t) => t.title.trim().toLowerCase()));
  const counts = new Map<string, { title: string; count: number }>();
  for (const t of tasks.missed) {
    const key = t.title.trim().toLowerCase();
    if (doneTitles.has(key)) continue;
    const cur = counts.get(key) ?? { title: t.title.trim(), count: 0 };
    counts.set(key, { ...cur, count: cur.count + 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export interface PillarTask {
  title: string;
  done: number;
  missed: number;
}

/** Zadania tygodnia zgrupowane po filarze, bez powtórek: ten sam tytuł z kilku dni to jedna pozycja z licznikiem. */
export function tasksByPillar(tasks: { done: ReviewTaskItem[]; missed: ReviewTaskItem[] }): Record<Pillar | 'inne', PillarTask[]> {
  const groups: Record<Pillar | 'inne', Map<string, PillarTask>> = { cialo: new Map(), duch: new Map(), konto: new Map(), inne: new Map() };
  const add = (t: ReviewTaskItem, done: boolean) => {
    const key = PILLAR_KEYS.includes(t.category as Pillar) ? (t.category as Pillar) : 'inne';
    const id = t.title.trim().toLowerCase();
    const cur = groups[key].get(id) ?? { title: t.title.trim(), done: 0, missed: 0 };
    groups[key].set(id, { ...cur, done: cur.done + (done ? 1 : 0), missed: cur.missed + (done ? 0 : 1) });
  };
  tasks.done.forEach((t) => add(t, true));
  tasks.missed.forEach((t) => add(t, false));
  const sorted = (m: Map<string, PillarTask>) => [...m.values()].sort((a, b) => b.done - a.done || b.missed - a.missed);
  return { cialo: sorted(groups.cialo), duch: sorted(groups.duch), konto: sorted(groups.konto), inne: sorted(groups.inne) };
}

export interface WeekKpi {
  key: 'tasks' | 'score' | 'sleep';
  label: string;
  value: string;
  /** Podpis pod liczbą, np. „zrobione” albo „śr. dnia”. */
  caption: string;
  /** 0–1 do cienkiego paska; null, gdy nie ma czego mierzyć. */
  ratio: number | null;
}

const oneDecimal = (value: number) => (Math.round(value * 10) / 10).toString().replace('.', ',');

/** Trzy liczby tygodnia na kafle: zadania, średnia ocena dnia i średni sen. Brakujące dane pomijamy, nie udajemy zer. */
export function weekKpis(context: {
  tasks?: { done: ReviewTaskItem[]; missed: ReviewTaskItem[] };
  days?: ReviewDay[];
}): WeekKpi[] {
  const kpis: WeekKpi[] = [];
  const { tasks, days } = context;

  if (tasks) {
    const total = tasks.done.length + tasks.missed.length;
    if (total > 0) {
      kpis.push({ key: 'tasks', label: 'Zadania', value: `${tasks.done.length}/${total}`, caption: 'zrobione', ratio: tasks.done.length / total });
    }
  }

  const scores = (days ?? []).flatMap((d) => (d.score != null ? [d.score] : []));
  if (scores.length > 0) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    kpis.push({ key: 'score', label: 'Ocena dnia', value: oneDecimal(mean), caption: `śr. z ${scores.length} dni`, ratio: mean / 10 });
  }

  const sleeps = (days ?? []).flatMap((d) => (d.sleepHours != null ? [d.sleepHours] : []));
  if (sleeps.length > 0) {
    const mean = sleeps.reduce((a, b) => a + b, 0) / sleeps.length;
    kpis.push({ key: 'sleep', label: 'Sen', value: `${oneDecimal(mean)} h`, caption: 'średnio na noc', ratio: Math.min(1, mean / 8) });
  }
  return kpis;
}

const isPillar = (category: string | null | undefined): category is Pillar => PILLAR_KEYS.includes(category as Pillar);

/** Zadania jednego dnia: najpierw zrobione, potem niezrobione, bo to pierwsze, co chcesz zobaczyć. */
export function tasksOnDay(tasks: { done: ReviewTaskItem[]; missed: ReviewTaskItem[] }, date: string): ReviewTaskItem[] {
  return [...tasks.done, ...tasks.missed].filter((t) => t.date === date).sort((a, b) => Number(b.done) - Number(a.done));
}

export interface GoalAlignment {
  total: number;
  /** Zadania przypisane do któregoś z trzech filarów (czyli do celów). */
  onGoal: number;
  onGoalDone: number;
  /** Zadania bez filaru. */
  off: number;
  offDone: number;
  byPillar: Array<{ key: Pillar; count: number }>;
}

/**
 * Ile zadań pracowało na cele: dopasowanie idzie po filarze zadania (kategoria), nie po treści.
 * Zestawienie zrobionych na cele i poza nimi pokazuje, czy tydzień szedł w stronę celów, czy obok nich.
 */
export function goalAlignment(tasks: { done: ReviewTaskItem[]; missed: ReviewTaskItem[] }): GoalAlignment {
  const all = [...tasks.done, ...tasks.missed];
  const onGoal = all.filter((t) => isPillar(t.category));
  const off = all.filter((t) => !isPillar(t.category));
  return {
    total: all.length,
    onGoal: onGoal.length,
    onGoalDone: onGoal.filter((t) => t.done).length,
    off: off.length,
    offDone: off.filter((t) => t.done).length,
    byPillar: PILLAR_KEYS.map((key) => ({ key, count: onGoal.filter((t) => t.category === key).length })),
  };
}
