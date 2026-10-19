import { epley, type ExerciseHistoryRow, type WorkoutExercise, type WorkoutSet } from '../workout/workoutUtils';

const COMPOUND_HINT = /sztang|martwy|przysiad|wyciskanie|ohp|podci[aą]ganie|dipy|hip thrust|wios[lł]owanie/i;

/** Domyślna przerwa: ciężkie złożone dłużej, izolacje krócej. */
export function defaultRestSeconds(name: string): number {
  return COMPOUND_HINT.test(name) ? 120 : 75;
}

export interface SetGhost {
  kg: string;
  reps: string;
}

/** Wartości z poprzedniego treningu dla danej serii (dla dodatkowych serii — z ostatniej). */
export function ghostFor(rows: ExerciseHistoryRow[], idx: number): SetGhost | null {
  const row = rows[idx] ?? rows[rows.length - 1];
  if (!row) return null;
  const kg = Number(row.weight);
  return {
    kg: Number.isFinite(kg) && kg > 0 ? String(kg) : '',
    reps: row.reps != null ? String(row.reps) : '',
  };
}

/** Podpowiedź serii: z historii, a gdy jej brak — z zapisanego planu. */
export function ghostForSet(rows: ExerciseHistoryRow[], idx: number, set: WorkoutSet): SetGhost | null {
  const fromHistory = ghostFor(rows, idx);
  if (fromHistory) return fromHistory;
  if (!set.prescription) return null;
  return { kg: set.prescription.weightKg != null ? String(set.prescription.weightKg) : '', reps: String(set.prescription.reps) };
}

const WARMUP_STEPS = [
  { share: 0.4, reps: '8' },
  { share: 0.6, reps: '5' },
  { share: 0.8, reps: '3' },
];

/** Rampa rozgrzewkowa (40/60/80% ciężaru roboczego, zaokrąglona do 2,5 kg); pusta, gdy ciężar jest za mały. */
export function warmupRamp(workingKg: number, barKg = 20): SetGhost[] {
  if (!Number.isFinite(workingKg) || workingKg < barKg * 2) return [];
  const ramp: SetGhost[] = [];
  for (const step of WARMUP_STEPS) {
    const kg = Math.max(barKg, Math.round((workingKg * step.share) / 2.5) * 2.5);
    if (ramp.length && Number(ramp[ramp.length - 1].kg) === kg) continue;
    ramp.push({ kg: String(kg), reps: step.reps });
  }
  return ramp;
}

export function isSetLogged(set: WorkoutSet): boolean {
  return Boolean(set.done) || Boolean(set.kg.trim() && set.reps.trim());
}

function setVolume(set: WorkoutSet): number {
  return (parseFloat(set.kg) || 0) * (parseInt(set.reps, 10) || 0);
}

export function isPersonalRecord(set: WorkoutSet, allTimeBest1RM: number | null | undefined): boolean {
  const estimate = epley(set.kg, set.reps);
  return Boolean(estimate && allTimeBest1RM && estimate > allTimeBest1RM);
}

export interface LiveSummary {
  sets: number;
  exercises: number;
  volumeKg: number;
  tags: string[];
}

export function summarize(exercises: WorkoutExercise[]): LiveSummary {
  const named = exercises.filter((e) => e.name.trim());
  const tags = new Map<string, number>();
  let sets = 0;
  let volumeKg = 0;
  for (const exercise of named) {
    const logged = exercise.sets.filter((s) => s.type !== 'warmup' && isSetLogged(s));
    sets += logged.length;
    for (const set of logged) volumeKg += setVolume(set);
    if (logged.length) for (const tag of exercise.tags) tags.set(tag, (tags.get(tag) ?? 0) + logged.length);
  }
  const top = [...tags.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  return { sets, exercises: named.filter((e) => e.sets.some(isSetLogged)).length, volumeKg: Math.round(volumeKg), tags: top };
}

const TAG_TITLE: Record<string, string> = {
  klatka: 'Klatka', plecy: 'Plecy', barki: 'Barki', biceps: 'Biceps', triceps: 'Triceps',
  czworogłowe: 'Nogi', 'dwugłowe ud': 'Nogi', pośladki: 'Nogi', łydki: 'Łydki', brzuch: 'Brzuch',
};

/** Nazwa sesji z najczęściej trenowanych partii, np. „Klatka · Triceps”. */
export function autoWorkoutName(exercises: WorkoutExercise[]): string {
  const titles: string[] = [];
  for (const tag of summarize(exercises).tags) {
    const title = TAG_TITLE[tag];
    if (title && !titles.includes(title)) titles.push(title);
    if (titles.length === 2) break;
  }
  return titles.length ? titles.join(' · ') : 'Trening';
}

export function formatKg(volumeKg: number): string {
  return volumeKg >= 1000 ? `${(volumeKg / 1000).toFixed(1).replace('.', ',')} t` : `${volumeKg} kg`;
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export const MAX_KG = 600;
export const MAX_REPS = 200;

/** Czyści wpis liczbowy: bez końcowej kropki i zer z przodu, w zadanych granicach (puste zostaje puste). */
export function normalizeNumber(value: string, max: number, integer: boolean): string {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '.') return '';
  const parsed = integer ? parseInt(trimmed, 10) : parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return '';
  return String(Math.min(max, parsed));
}

/** Serię można zaliczyć, gdy są powtórzenia (z wpisu albo z podpowiedzi). Ciężar może być pusty — ćwiczenia z masą ciała. */
export function canComplete(set: WorkoutSet, ghost: SetGhost | null): boolean {
  const reps = parseInt(set.reps, 10) || parseInt(ghost?.reps ?? '', 10) || 0;
  return reps > 0;
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Serie z wpisanymi wartościami, ale bez ✓ — trafią do zapisu, więc pokazujemy je w podsumowaniu. */
export function countUnchecked(exercises: WorkoutExercise[]): number {
  return exercises.reduce(
    (sum, e) => sum + (e.name.trim() ? e.sets.filter((s) => s.type !== 'warmup' && !s.done && (s.kg.trim() !== '' || s.reps.trim() !== '')).length : 0),
    0,
  );
}

/** Zabezpieczenie przed podwójnym stuknięciem: drugie wywołanie w krótkim czasie jest ignorowane. */
export function createToggleGuard(windowMs = 250) {
  let last = 0;
  return {
    pass(): boolean {
      const now = Date.now();
      if (now - last < windowMs) return false;
      last = now;
      return true;
    },
  };
}
