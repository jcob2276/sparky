/**
 * Monthly review — spine layer between sprint (12w) and weekly.
 * Due in the first 14 days of a new month (hard cue on first Sunday).
 */
import { format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { pl } from 'date-fns/locale';

import { getTodayWarsaw } from '../date';
import type { Tables } from '../database.types';

export type MonthlyReviewRow = Tables<'monthly_reviews'>;

const MONTHLY_GRACE_DAYS = 14;
const MONTHLY_HARD_GATE_DAYS = 0; // Never hard-block — monthly review is soft cue only

export function monthLabel(monthStart: string): string {
  return format(parseISO(`${monthStart}T12:00:00`), 'LLLL yyyy', { locale: pl });
}

export function calendarMonthStart(today: string = getTodayWarsaw()): string {
  return format(startOfMonth(parseISO(`${today}T12:00:00`)), 'yyyy-MM-dd');
}

/** Review row that carries theme for the current calendar month (set when closing prior month). */
export function monthThemeSourceStart(today: string = getTodayWarsaw()): string {
  return format(startOfMonth(subMonths(parseISO(`${today}T12:00:00`), 1)), 'yyyy-MM-dd');
}


function dayOfMonthWarsaw(today: string): number {
  return parseISO(`${today}T12:00:00`).getDate();
}

/** First day of the calendar month being closed (previous month during grace window). */
export function closingMonthStartForReview(today: string = getTodayWarsaw()): string | null {
  if (dayOfMonthWarsaw(today) > MONTHLY_GRACE_DAYS) return null;
  return format(startOfMonth(subMonths(parseISO(`${today}T12:00:00`), 1)), 'yyyy-MM-dd');
}

export function isMonthlyReviewDue(
  today: string = getTodayWarsaw(),
  review: Pick<MonthlyReviewRow, 'completed_at'> | null = null,
): boolean {
  const closing = closingMonthStartForReview(today);
  if (!closing) return false;
  return !review?.completed_at;
}

/** Days 1–7 of month: monthly blocks week/day until done. */
export function isMonthlyHardGate(today: string = getTodayWarsaw()): boolean {
  if (!closingMonthStartForReview(today)) return false;
  return dayOfMonthWarsaw(today) <= MONTHLY_HARD_GATE_DAYS;
}

/** Days 8–14: monthly visible + cue in spine, but day/week can proceed. */
export function isMonthlySoftCue(today: string = getTodayWarsaw()): boolean {
  const dom = dayOfMonthWarsaw(today);
  return dom > MONTHLY_HARD_GATE_DAYS && dom <= MONTHLY_GRACE_DAYS && closingMonthStartForReview(today) !== null;
}

export function isFirstSundayMonthlyRitual(today: string = getTodayWarsaw()): boolean {
  const d = parseISO(`${today}T12:00:00`);
  if (d.getDay() !== 0) return false;
  return d.getDate() <= 7;
}
