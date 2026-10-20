import type { Tables } from '../database.types';

export type LearningAssignment = Tables<'learning_assignments'>;
export type LearningUnit = 'pages' | 'minutes' | 'lessons' | 'items';
export type LearningResourceType = 'book' | 'course' | 'article' | 'video' | 'podcast' | 'other';

/** Ile maksymalnie pozycji planujemy na miesiąc (plan ma być wykonalny, nie lista życzeń). */
export const MAX_ACTIVE_PER_MONTH = 3;

const MS_PER_DAY = 86_400_000;
const MINUTES_PER_PAGE = 2.5;
const MINUTES_PER_LESSON = 30;
const MINUTES_PER_ITEM = 20;

export const UNIT_LABELS: Record<LearningUnit, string> = {
  pages: 'stron',
  minutes: 'minut',
  lessons: 'lekcji',
  items: 'sztuk',
};

export const TYPE_LABELS: Record<LearningResourceType, string> = {
  book: 'Książka',
  course: 'Kurs',
  article: 'Artykuł',
  video: 'Film / wideo',
  podcast: 'Podcast',
  other: 'Materiał',
};

/** Sensowna jednostka domyślna dla typu materiału. */
export const DEFAULT_UNIT_BY_TYPE: Record<LearningResourceType, LearningUnit> = {
  book: 'pages',
  course: 'lessons',
  article: 'items',
  video: 'minutes',
  podcast: 'minutes',
  other: 'items',
};

function dayIndex(iso: string): number {
  return Math.floor(new Date(`${iso}T12:00:00Z`).getTime() / MS_PER_DAY);
}

export function monthStartOf(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

export function monthEndOf(dateIso: string): string {
  const [year, month] = dateIso.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${dateIso.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
}

export function nextMonthStart(dateIso: string): string {
  const [year, month] = dateIso.split('-').map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/** Dni do terminu włącznie z dzisiejszym; po terminie zawsze 1 (zaległość do nadrobienia dziś). */
export function daysLeft(todayIso: string, dueIso: string): number {
  return Math.max(1, dayIndex(dueIso) - dayIndex(todayIso) + 1);
}

export interface DailySlot {
  /** Ile do zrobienia dziś (w jednostce materiału), zaokrąglone w górę. */
  amount: number;
  /** Dla stron: zakres do przeczytania dziś. */
  fromPage: number | null;
  toPage: number | null;
  minutes: number;
  /** Zostało na koniec dziś, jeśli zrobisz slot. */
  remainingAfter: number;
  daysLeft: number;
  overdue: boolean;
}

export type PaceStatus = 'done' | 'ahead' | 'on_track' | 'behind';

function minutesFor(unit: LearningUnit, amount: number): number {
  if (unit === 'minutes') return amount;
  if (unit === 'pages') return Math.round(amount * MINUTES_PER_PAGE);
  if (unit === 'lessons') return Math.round(amount * MINUTES_PER_LESSON);
  return Math.round(amount * MINUTES_PER_ITEM);
}

/**
 * Dzienny slot z tego, co zostało: (total − done na początku dziś) / dni do terminu, w górę.
 * `loggedToday` to ilość już zapisana na dziś, więc slot nie „ucieka”, gdy odhaczysz go rano.
 */
export function dailySlot(
  assignment: Pick<LearningAssignment, 'total' | 'done' | 'unit' | 'due_date'>,
  todayIso: string,
  loggedToday = 0,
): DailySlot {
  const total = Number(assignment.total);
  const doneAtStart = Math.max(0, Number(assignment.done) - loggedToday);
  const remainingAtStart = Math.max(0, total - doneAtStart);
  const left = daysLeft(todayIso, assignment.due_date);
  const amount = Math.min(remainingAtStart, Math.ceil(remainingAtStart / left));
  const isPages = assignment.unit === 'pages';
  return {
    amount,
    fromPage: isPages && amount > 0 ? Math.floor(doneAtStart) + 1 : null,
    toPage: isPages && amount > 0 ? Math.floor(doneAtStart) + amount : null,
    minutes: minutesFor(assignment.unit as LearningUnit, amount),
    remainingAfter: Math.max(0, remainingAtStart - amount),
    daysLeft: left,
    overdue: assignment.due_date < todayIso,
  };
}

/**
 * Tempo względem liniowego planu od początku miesiąca do terminu.
 * „Za tempem” dopiero, gdy brakuje więcej niż jednego dziennego slotu (jeden gorszy dzień to nie problem).
 */
export function paceStatus(
  assignment: Pick<LearningAssignment, 'total' | 'done' | 'month_start' | 'due_date' | 'status'>,
  todayIso: string,
  loggedToday = 0,
): PaceStatus {
  if (assignment.status === 'done' || Number(assignment.done) >= Number(assignment.total)) return 'done';
  const total = Number(assignment.total);
  const span = Math.max(1, dayIndex(assignment.due_date) - dayIndex(assignment.month_start) + 1);
  const elapsedBeforeToday = Math.max(0, Math.min(span, dayIndex(todayIso) - dayIndex(assignment.month_start)));
  const expected = (total * elapsedBeforeToday) / span;
  const doneAtStart = Math.max(0, Number(assignment.done) - loggedToday);
  const oneDay = total / span;
  if (doneAtStart + oneDay < expected) return 'behind';
  if (doneAtStart > expected + oneDay) return 'ahead';
  return 'on_track';
}

export function progressPct(assignment: Pick<LearningAssignment, 'total' | 'done'>): number {
  const total = Number(assignment.total);
  if (!(total > 0)) return 0;
  return Math.min(100, Math.round((Number(assignment.done) / total) * 100));
}

export function formatSlot(slot: DailySlot, unit: LearningUnit): string {
  if (slot.amount <= 0) return 'Nic na dziś';
  if (unit === 'pages' && slot.fromPage != null && slot.toPage != null) {
    return slot.fromPage === slot.toPage ? `str. ${slot.fromPage}` : `str. ${slot.fromPage}–${slot.toPage}`;
  }
  if (unit === 'minutes') return `${slot.amount} min`;
  if (unit === 'lessons') return slot.amount === 1 ? '1 lekcja' : `${slot.amount} lekcje`;
  return slot.amount === 1 ? '1 sztuka' : `${slot.amount} szt.`;
}

export const PACE_LABELS: Record<PaceStatus, string> = {
  done: 'Skończone',
  ahead: 'Przed planem',
  on_track: 'Zgodnie z planem',
  behind: 'Za planem',
};

/** Aktywne pozycje, najpierw te za tempem, potem wg pozycji. */
export function sortForToday(
  items: LearningAssignment[],
  todayIso: string,
  logged: Record<string, number>,
): LearningAssignment[] {
  const rank: Record<PaceStatus, number> = { behind: 0, on_track: 1, ahead: 2, done: 3 };
  return [...items].sort((a, b) => {
    const pa = rank[paceStatus(a, todayIso, logged[a.id] ?? 0)];
    const pb = rank[paceStatus(b, todayIso, logged[b.id] ?? 0)];
    return pa - pb || a.position - b.position;
  });
}
