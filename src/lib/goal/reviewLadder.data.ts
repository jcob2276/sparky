import { getSprintInfoForDate } from '@vanguard/domain';
import { supabase } from '../supabase';
import type { Json } from '../database.types';
import { addDays, sprintFirstMonday, type DueReview } from './reviewCycle';
import { asScores, type GoalStatuses, type LadderMonth, type LadderWeek, type ReviewLadder } from './reviewCycle.types';

const trimmed = (value: string | null | undefined) => value?.trim() || undefined;

const asStatuses = (raw: unknown): GoalStatuses => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: GoalStatuses = {};
  for (const key of ['cialo', 'duch', 'konto'] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (value === 'done' || value === 'partial' || value === 'missed') out[key] = value;
  }
  return out;
};

interface WeekRow {
  week_start: string;
  pillar_scores: unknown;
  week_goal_cialo: string | null;
  week_goal_duch: string | null;
  week_goal_konto: string | null;
  week_highlight: string | null;
  goal_status: unknown;
  review_completed_at: string | null;
}

interface MonthRow {
  month_start: string;
  pillar_scores: unknown;
  goal_cialo: string | null;
  goal_duch: string | null;
  goal_konto: string | null;
  month_theme: string | null;
  correction_note: string | null;
  goal_status: unknown;
  completed_at: string | null;
}

export function buildLadder(
  firstMonday: string,
  reviewedWeekStart: string,
  sprint: { label: string; summary: string | null; goals: ReviewLadder['goals'] },
  weekRows: WeekRow[],
  monthRows: MonthRow[],
): ReviewLadder {
  const weekByStart = new Map(weekRows.map((r) => [r.week_start, r]));
  const monthByStart = new Map(monthRows.map((r) => [r.month_start, r]));

  const weeks: LadderWeek[] = Array.from({ length: 12 }, (_, i) => {
    const weekStart = addDays(firstMonday, i * 7);
    const row = weekByStart.get(weekStart);
    return {
      weekStart,
      number: i + 1,
      goals: row
        ? { cialo: trimmed(row.week_goal_cialo), duch: trimmed(row.week_goal_duch), konto: trimmed(row.week_goal_konto) }
        : {},
      scores: asScores(row?.pillar_scores as Json | null | undefined),
      goalStatus: asStatuses(row?.goal_status),
      note: trimmed(row?.week_highlight) ?? null,
      closed: Boolean(row?.review_completed_at),
      current: weekStart === reviewedWeekStart,
      future: weekStart > reviewedWeekStart,
    };
  });

  const months: LadderMonth[] = ([1, 2, 3] as const).map((number) => {
    const blockStart = addDays(firstMonday, (number - 1) * 28);
    const row = monthByStart.get(blockStart);
    const blockEnd = addDays(blockStart, 27);
    return {
      blockStart,
      number,
      theme: trimmed(row?.month_theme) ?? null,
      goals: row ? { cialo: trimmed(row.goal_cialo), duch: trimmed(row.goal_duch), konto: trimmed(row.goal_konto) } : {},
      scores: asScores(row?.pillar_scores as Json | null | undefined),
      goalStatus: asStatuses(row?.goal_status),
      note: trimmed(row?.correction_note) ?? null,
      closed: Boolean(row?.completed_at),
      current: reviewedWeekStart >= blockStart && reviewedWeekStart <= blockEnd,
    };
  });

  return { ...sprint, weeks, months };
}

/** Sprint, w którym leży przeglądany okres: cele sprintu, 3 miesiące i 12 tygodni z tym, co w nich zapisano. */
export async function fetchReviewLadder(userId: string, due: DueReview): Promise<ReviewLadder> {
  const info = getSprintInfoForDate(addDays(due.periodStart, 1));
  const firstMonday = sprintFirstMonday(info.sprintStart);
  const lastMonday = addDays(firstMonday, 77);

  const [sprintRes, weeksRes, monthsRes] = await Promise.all([
    supabase
      .from('sprint_goals')
      .select('goal_cialo, goal_duch, goal_konto, goal_text')
      .eq('user_id', userId)
      .eq('personal_year', info.personalYear)
      .eq('sprint_number', info.sprintNumber)
      .maybeSingle(),
    supabase
      .from('weekly_reviews')
      .select('week_start, pillar_scores, week_goal_cialo, week_goal_duch, week_goal_konto, week_highlight, goal_status, review_completed_at')
      .eq('user_id', userId)
      .gte('week_start', firstMonday)
      .lte('week_start', lastMonday),
    supabase
      .from('monthly_reviews')
      .select('month_start, pillar_scores, goal_cialo, goal_duch, goal_konto, month_theme, correction_note, goal_status, completed_at')
      .eq('user_id', userId)
      .gte('month_start', firstMonday)
      .lte('month_start', addDays(firstMonday, 56)),
  ]);
  if (sprintRes.error) throw sprintRes.error;
  if (weeksRes.error) throw weeksRes.error;
  if (monthsRes.error) throw monthsRes.error;

  const goal = sprintRes.data;
  return buildLadder(
    firstMonday,
    // Tydzień: ten przeglądany. Miesiąc i sprint: ostatni tydzień zamykanego okresu.
    due.kind === 'week' ? due.periodStart : addDays(due.periodEnd, -6),
    {
      label: `Sprint ${info.sprintNumber}`,
      summary: trimmed(goal?.goal_text) ?? null,
      goals: goal ? { cialo: trimmed(goal.goal_cialo), duch: trimmed(goal.goal_duch), konto: trimmed(goal.goal_konto) } : {},
    },
    weeksRes.data ?? [],
    monthsRes.data ?? [],
  );
}
