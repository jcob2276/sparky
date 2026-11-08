import { getSprintInfoForDate } from '@vanguard/domain';
import { supabase } from '../supabase';
import type { Json } from '../database.types';
import { invalidateGoalSpineCache } from './goalSpine.queries';
import { addDays, computeDueReviews, sprintKey, type DueReview, type ReviewCycleState } from './reviewCycle';

export type Pillar = 'cialo' | 'duch' | 'konto';
export const PILLARS: ReadonlyArray<{ key: Pillar; label: string }> = [
  { key: 'cialo', label: 'Ciało' },
  { key: 'duch', label: 'Duch' },
  { key: 'konto', label: 'Konto' },
];

export type PillarScores = Record<Pillar, number>;
export type PillarGoals = Record<Pillar, string>;

export interface ReviewAnswers {
  scores: PillarScores;
  goals: PillarGoals;
  note: string;
}

export interface ReviewContext {
  /** Cele z poprzedniego okresu: to z nimi porównujesz stan. */
  previousGoals: Partial<Record<Pillar, string>> | null;
  /** Oceny z zamkniętych tygodni okresu (tylko dla miesiąca i sprintu). */
  weekScores: Array<{ weekStart: string; scores: Partial<Record<Pillar, number>> }>;
}

/** Średnia ocen filaru z zamkniętych tygodni okresu, do porównania z własną oceną. */
export function averageScore(weekScores: ReviewContext['weekScores'], pillar: Pillar): number | null {
  const values = weekScores.map((w) => w.scores[pillar]).filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

const asScores = (raw: Json | null | undefined): Partial<Record<Pillar, number>> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Partial<Record<Pillar, number>> = {};
  for (const { key } of PILLARS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
  }
  return out;
};

const goalsFrom = (row: { goal_cialo?: string | null; goal_duch?: string | null; goal_konto?: string | null } | null) =>
  row ? { cialo: row.goal_cialo?.trim() || undefined, duch: row.goal_duch?.trim() || undefined, konto: row.goal_konto?.trim() || undefined } : null;

async function fetchReviewCycleState(userId: string, today: string): Promise<ReviewCycleState> {
  const [weeks, months, sprints] = await Promise.all([
    supabase.from('weekly_reviews').select('week_start').eq('user_id', userId).not('review_completed_at', 'is', null).gte('week_start', addDays(today, -45)),
    supabase.from('monthly_reviews').select('month_start').eq('user_id', userId).not('completed_at', 'is', null).gte('month_start', addDays(today, -120)),
    supabase.from('sprint_reviews').select('personal_year, sprint_number').eq('user_id', userId).not('completed_at', 'is', null),
  ]);
  if (weeks.error) throw weeks.error;
  if (months.error) throw months.error;
  if (sprints.error) throw sprints.error;
  return {
    today,
    weeksDone: new Set((weeks.data ?? []).map((r) => r.week_start)),
    monthsDone: new Set((months.data ?? []).map((r) => r.month_start)),
    sprintsDone: new Set((sprints.data ?? []).map((r) => sprintKey(r.personal_year, r.sprint_number))),
  };
}

export async function fetchDueReviews(userId: string, today: string): Promise<DueReview[]> {
  return computeDueReviews(await fetchReviewCycleState(userId, today));
}

export async function fetchReviewContext(userId: string, due: DueReview): Promise<ReviewContext> {
  if (due.kind === 'week') {
    const { data, error } = await supabase
      .from('weekly_reviews')
      .select('week_goal_cialo, week_goal_duch, week_goal_konto')
      .eq('user_id', userId)
      .eq('week_start', due.periodStart)
      .maybeSingle();
    if (error) throw error;
    return {
      previousGoals: data
        ? { cialo: data.week_goal_cialo?.trim() || undefined, duch: data.week_goal_duch?.trim() || undefined, konto: data.week_goal_konto?.trim() || undefined }
        : null,
      weekScores: [],
    };
  }

  const weeksQuery = supabase
    .from('weekly_reviews')
    .select('week_start, pillar_scores')
    .eq('user_id', userId)
    .gte('week_start', due.periodStart)
    .lte('week_start', due.periodEnd)
    .order('week_start');

  let goalsQuery;
  if (due.kind === 'month') {
    goalsQuery = supabase
      .from('monthly_reviews')
      .select('goal_cialo, goal_duch, goal_konto')
      .eq('user_id', userId)
      .eq('month_start', addDays(due.periodStart, -28))
      .maybeSingle();
  } else {
    const sprint = getSprintInfoForDate(addDays(due.periodStart, 1));
    goalsQuery = supabase
      .from('sprint_goals')
      .select('goal_cialo, goal_duch, goal_konto')
      .eq('user_id', userId)
      .eq('personal_year', sprint.personalYear)
      .eq('sprint_number', sprint.sprintNumber)
      .maybeSingle();
  }

  const [weeks, goals] = await Promise.all([weeksQuery, goalsQuery]);
  if (weeks.error) throw weeks.error;
  if (goals.error) throw goals.error;
  return {
    previousGoals: goalsFrom(goals.data),
    weekScores: (weeks.data ?? [])
      .map((row) => ({ weekStart: row.week_start, scores: asScores(row.pillar_scores) }))
      .filter((row) => Object.keys(row.scores).length > 0),
  };
}

const joinGoals = (goals: PillarGoals) => `Ciało: ${goals.cialo} · Duch: ${goals.duch} · Konto: ${goals.konto}`;

/** Zamyka okres i zapisuje cele na następny. Wszystko w istniejących tabelach przeglądów. */
export async function closeReview(userId: string, due: DueReview, answers: ReviewAnswers): Promise<void> {
  const { scores, note } = answers;
  const goals: PillarGoals = { cialo: answers.goals.cialo.trim(), duch: answers.goals.duch.trim(), konto: answers.goals.konto.trim() };
  const now = new Date().toISOString();
  const cleanNote = note.trim() || null;
  const scoresJson: Json = scores;

  if (due.kind === 'week') {
    const closing = await supabase.from('weekly_reviews').upsert(
      { user_id: userId, week_start: due.periodStart, pillar_scores: scoresJson, week_highlight: cleanNote, review_completed_at: now },
      { onConflict: 'user_id,week_start' },
    );
    if (closing.error) throw closing.error;
    const next = await supabase.from('weekly_reviews').upsert(
      { user_id: userId, week_start: due.nextStart, week_goal_cialo: goals.cialo, week_goal_duch: goals.duch, week_goal_konto: goals.konto },
      { onConflict: 'user_id,week_start' },
    );
    if (next.error) throw next.error;
  } else if (due.kind === 'month') {
    const { error } = await supabase.from('monthly_reviews').upsert(
      {
        user_id: userId,
        month_start: due.periodStart,
        pillar_scores: scoresJson,
        goal_cialo: goals.cialo,
        goal_duch: goals.duch,
        goal_konto: goals.konto,
        month_theme: joinGoals(goals),
        correction_note: cleanNote,
        completed_at: now,
        updated_at: now,
      },
      { onConflict: 'user_id,month_start' },
    );
    if (error) throw error;
  } else {
    const closing = getSprintInfoForDate(addDays(due.periodStart, 1));
    const upcoming = getSprintInfoForDate(due.nextStart);
    const review = await supabase.from('sprint_reviews').upsert(
      {
        user_id: userId,
        personal_year: closing.personalYear,
        sprint_number: closing.sprintNumber,
        pillar_scores: scoresJson,
        reflection: cleanNote,
        completed_at: now,
        updated_at: now,
      },
      { onConflict: 'user_id,personal_year,sprint_number' },
    );
    if (review.error) throw review.error;
    const goal = await supabase.from('sprint_goals').upsert(
      {
        user_id: userId,
        personal_year: upcoming.personalYear,
        sprint_number: upcoming.sprintNumber,
        goal_text: joinGoals(goals),
        goal_cialo: goals.cialo,
        goal_duch: goals.duch,
        goal_konto: goals.konto,
        updated_at: now,
      },
      { onConflict: 'user_id,personal_year,sprint_number' },
    );
    if (goal.error) throw goal.error;
  }
  invalidateGoalSpineCache(userId);
}
