/**
 * Sprinty 12-tygodniowe liczone od 1 marca (rok osobisty). Jedna definicja dla aplikacji i funkcji edge
 * (docs/SINGLE_SOURCE.md); wejście to dzień `YYYY-MM-DD` w Warszawie.
 */
const SPRINT_DAYS = 84; // 12 × 7
const DAY_MS = 86_400_000;

export interface SprintInfo {
  personalYear: number;
  sprintNumber: number;
  weekInSprint: number;
  dayInSprint: number;
  daysLeft: number;
  pct: number;
  sprintStart: string;
  sprintEnd: string;
  prevStart: string | null;
  prevEnd: string | null;
}

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function getSprintInfoForDate(dateStr: string): SprintInfo {
  const now = new Date(`${dateStr}T12:00:00Z`).getTime();
  const year = new Date(now).getUTCFullYear();
  let personalYear = year;
  let anchor = new Date(`${year}-03-01T12:00:00Z`).getTime();
  if (now < anchor) {
    personalYear = year - 1;
    anchor = new Date(`${personalYear}-03-01T12:00:00Z`).getTime();
  }
  const daysSince = Math.floor((now - anchor) / DAY_MS);
  const weeksSince = Math.floor(daysSince / 7);
  const sprintNumber = Math.floor(weeksSince / 12) + 1;
  const dayInSprint = daysSince % SPRINT_DAYS;
  const start = anchor + (sprintNumber - 1) * SPRINT_DAYS * DAY_MS;
  return {
    personalYear,
    sprintNumber,
    weekInSprint: (weeksSince % 12) + 1,
    dayInSprint,
    daysLeft: SPRINT_DAYS - dayInSprint - 1,
    pct: Math.round((dayInSprint / SPRINT_DAYS) * 100),
    sprintStart: dayKey(start),
    sprintEnd: dayKey(start + (SPRINT_DAYS - 1) * DAY_MS),
    prevStart: sprintNumber > 1 ? dayKey(start - SPRINT_DAYS * DAY_MS) : null,
    prevEnd: sprintNumber > 1 ? dayKey(start - DAY_MS) : null,
  };
}
