import { getSprintInfoForDate, shiftDateStr } from '@vanguard/domain';

/**
 * Rytm przeglądów: tydzień (niedziela), miesiąc = 4 tygodnie sprintu, sprint = 12 tygodni.
 * Funkcje są czyste: dostają dzień i zbiory już zamkniętych okresów, zwracają co jest zaległe.
 * Kolejność wykonania: sprint, potem miesiąc, potem tydzień (od najstarszego).
 */
type ReviewKind = 'week' | 'month' | 'sprint';

export interface DueReview {
  kind: ReviewKind;
  /** Unikalny klucz okresu (do cache i rozróżnienia kroków). */
  key: string;
  /** Pierwszy dzień okresu (poniedziałek dla tygodnia i miesiąca, start sprintu dla sprintu). */
  periodStart: string;
  /** Ostatni dzień okresu (niedziela). */
  periodEnd: string;
  label: string;
  /** Okres, na który ustawiasz cele po zamknięciu (kolejny tydzień, 4 tygodnie lub sprint). */
  nextStart: string;
  nextEnd: string;
}

export interface ReviewCycleState {
  today: string;
  /** week_start (poniedziałek) tygodni z zamkniętym przeglądem. */
  weeksDone: ReadonlySet<string>;
  /** month_start (poniedziałek pierwszego tygodnia bloku) miesięcy z zamkniętym przeglądem. */
  monthsDone: ReadonlySet<string>;
  /** `${personalYear}-${sprintNumber}` sprintów z zamkniętym przeglądem. */
  sprintsDone: ReadonlySet<string>;
}

export function addDays(date: string, days: number): string {
  return shiftDateStr(date, days);
}

function isSunday(date: string): boolean {
  return new Date(`${date}T12:00:00Z`).getUTCDay() === 0;
}

export function weekStartOf(date: string): string {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, -((dow + 6) % 7));
}

export function sprintKey(personalYear: number, sprintNumber: number): string {
  return `${personalYear}-${sprintNumber}`;
}

const MONTHS_PL = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

function shortDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS_PL[m - 1]}`;
}

function rangeLabel(start: string, end: string): string {
  return `${shortDate(start)} – ${shortDate(end)}`;
}

function weekReview(weekStart: string): DueReview {
  const periodEnd = addDays(weekStart, 6);
  return {
    kind: 'week',
    key: `week:${weekStart}`,
    periodStart: weekStart,
    periodEnd,
    label: `Tydzień ${rangeLabel(weekStart, periodEnd)}`,
    nextStart: addDays(weekStart, 7),
    nextEnd: addDays(weekStart, 13),
  };
}

function monthReview(blockStart: string, blockNumber: 1 | 2, sprintNumber: number): DueReview {
  const periodEnd = addDays(blockStart, 27);
  return {
    kind: 'month',
    key: `month:${blockStart}`,
    periodStart: blockStart,
    periodEnd,
    label: `Miesiąc ${blockNumber}/3 sprintu ${sprintNumber} · ${rangeLabel(blockStart, periodEnd)}`,
    nextStart: addDays(blockStart, 28),
    nextEnd: addDays(blockStart, 55),
  };
}

/** Sprint liczony jest od niedzieli 1 marca; tygodnie przeglądów są od poniedziałku, więc pierwszy pełny tydzień sprintu zaczyna się w poniedziałek po jego starcie. */
export function sprintFirstMonday(sprintStart: string): string {
  const monday = weekStartOf(sprintStart);
  return monday === sprintStart ? monday : addDays(monday, 7);
}

function sprintReview(sprint: { personalYear: number; sprintNumber: number; sprintStart: string }): DueReview {
  const periodStart = sprintFirstMonday(sprint.sprintStart);
  const periodEnd = addDays(periodStart, 83);
  return {
    kind: 'sprint',
    key: `sprint:${sprintKey(sprint.personalYear, sprint.sprintNumber)}`,
    periodStart,
    periodEnd,
    label: `Sprint ${sprint.sprintNumber} · ${rangeLabel(periodStart, periodEnd)}`,
    nextStart: addDays(periodEnd, 1),
    nextEnd: addDays(periodEnd, 84),
  };
}

/** Zaległe przeglądy w kolejności wykonania: sprint, miesiąc, tydzień (od najstarszego). */
export function computeDueReviews(state: ReviewCycleState): DueReview[] {
  const { today, weeksDone, monthsDone, sprintsDone } = state;
  const sprint = getSprintInfoForDate(today);
  const due: DueReview[] = [];

  // Sprint: poprzedni sprint kończy się w niedzielę, która jest już pierwszym dniem następnego,
  // więc zaległy jest zawsze ten poprzedni, dopóki go nie zamkniesz.
  const prev = getSprintInfoForDate(addDays(sprint.sprintStart, -1));
  if (!sprintsDone.has(sprintKey(prev.personalYear, prev.sprintNumber))) {
    due.push(sprintReview(prev));
  }

  // Miesiące: bloki 1 i 2 bieżącego sprintu (blok 3 zamyka sprint).
  const firstMonday = sprintFirstMonday(sprint.sprintStart);
  for (const block of [1, 2] as const) {
    const blockStart = addDays(firstMonday, 28 * (block - 1));
    const blockEnd = addDays(blockStart, 27);
    if (today >= blockEnd && !monthsDone.has(blockStart)) {
      due.push(monthReview(blockStart, block, sprint.sprintNumber));
    }
  }

  // Tygodnie: poprzedni (jeśli niezamknięty) i bieżący, gdy dzisiaj jest niedziela.
  const thisWeek = weekStartOf(today);
  const lastWeek = addDays(thisWeek, -7);
  if (!weeksDone.has(lastWeek)) due.push(weekReview(lastWeek));
  if (isSunday(today) && !weeksDone.has(thisWeek)) due.push(weekReview(thisWeek));

  return due;
}
