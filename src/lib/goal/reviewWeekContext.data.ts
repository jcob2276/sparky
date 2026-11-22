import { getSprintInfoForDate } from '@vanguard/domain';
import { fetchDailyWinTasks } from '../dailyWinTasksApi';
import { supabase } from '../supabase';
import { addDays, type DueReview } from './reviewCycle';
import { buildReviewDays } from './reviewWeekDays';
import {
  asScores,
  type ReviewContext,
  type ReviewExpenseCategory,
  type ReviewExpenseItem,
  type ReviewHistoryEntry,
  type ReviewTaskItem,
  type ReviewVoiceHighlight,
} from './reviewCycle.types';

const EXCLUDED_CATEGORIES = new Set(['przelewy_wlasne', 'inwestycje']);

const trimmed = (value: string | null | undefined) => value?.trim() || undefined;

function fetchWeekSources(userId: string, due: DueReview) {
  const sprint = getSprintInfoForDate(due.periodStart);
  return Promise.all([
    supabase
      .from('weekly_reviews')
      .select('week_goal_cialo, week_goal_duch, week_goal_konto, ai_recap')
      .eq('user_id', userId)
      .eq('week_start', due.periodStart)
      .maybeSingle(),
    supabase
      .from('weekly_reviews')
      .select('week_start, pillar_scores, week_highlight, week_goal_cialo, week_goal_duch, week_goal_konto')
      .eq('user_id', userId)
      .lt('week_start', due.periodStart)
      .not('review_completed_at', 'is', null)
      .order('week_start', { ascending: false })
      .limit(8),
    fetchDailyWinTasks(userId, { from: due.periodStart, to: due.periodEnd, ascending: true }),
    supabase
      .from('bank_transactions')
      .select('id, amount, booking_date, category, counterparty_name, remittance')
      .eq('user_id', userId)
      .eq('direction', 'debit')
      .gte('booking_date', due.periodStart)
      .lte('booking_date', due.periodEnd)
      .order('booking_date', { ascending: false }),
    supabase
      .from('vanguard_stream')
      .select('id, content, created_at, metadata, source, timestamp')
      .eq('user_id', userId)
      .gte('timestamp', `${due.periodStart}T00:00:00`)
      .lte('timestamp', `${due.periodEnd}T23:59:59`)
      .order('timestamp', { ascending: false })
      .limit(30),
    supabase
      .from('daily_reconciliations')
      .select('date, day_score')
      .eq('user_id', userId)
      .gte('date', due.periodStart)
      .lte('date', due.periodEnd),
    supabase
      .from('oura_daily_summary')
      .select('date, total_sleep_hours, bedtime_timestamp')
      .eq('user_id', userId)
      .gte('date', due.periodStart)
      .lte('date', due.periodEnd),
    supabase
      .from('sprint_goals')
      .select('goal_cialo, goal_duch, goal_konto, goal_text')
      .eq('user_id', userId)
      .eq('personal_year', sprint.personalYear)
      .eq('sprint_number', sprint.sprintNumber)
      .maybeSingle(),
    supabase
      .from('phone_usage_daily')
      .select('date, total_minutes')
      .eq('user_id', userId)
      .gte('date', due.periodStart)
      .lte('date', due.periodEnd),
  ]);
}

type Sources = Awaited<ReturnType<typeof fetchWeekSources>>;

function buildScoreHistory(pastRows: NonNullable<Sources[1]['data']>, periodStart: string) {
  const monthAgoRow = pastRows.find((r) => r.week_start <= addDays(periodStart, -28)) ?? pastRows[3];
  const history: ReviewHistoryEntry[] = pastRows.map((r) => ({
    weekStart: r.week_start,
    scores: asScores(r.pillar_scores),
    goals: { cialo: trimmed(r.week_goal_cialo), duch: trimmed(r.week_goal_duch), konto: trimmed(r.week_goal_konto) },
    commitment: r.week_highlight?.trim() || null,
  }));
  return {
    history,
    lastWeekScores: pastRows.length > 0 ? asScores(pastRows[0].pillar_scores) : null,
    monthAgoScores: monthAgoRow ? asScores(monthAgoRow.pillar_scores) : null,
    weekScores: history
      .slice(0, 4)
      .map(({ weekStart, scores }) => ({ weekStart, scores }))
      .filter((row) => Object.keys(row.scores).length > 0),
  };
}

function buildTasks(wins: Sources[2]['data']) {
  const done: ReviewTaskItem[] = [];
  const missed: ReviewTaskItem[] = [];
  for (const win of wins ?? []) {
    const tasks = Array.isArray(win.daily_win_tasks) ? win.daily_win_tasks : [];
    for (const t of tasks) {
      if (!t.title) continue;
      const item: ReviewTaskItem = { id: t.id, title: t.title, done: Boolean(t.done), category: t.category, date: win.date };
      (t.done ? done : missed).push(item);
    }
  }
  return { done, missed };
}

function buildExpenses(rows: Sources[3]['data']) {
  const valid = (rows ?? []).filter((tx) => !EXCLUDED_CATEGORIES.has(tx.category ?? ''));
  const catMap = new Map<string, { total: number; count: number }>();
  const topExpenses: ReviewExpenseItem[] = [];
  let total = 0;
  for (const tx of valid) {
    const amount = Math.abs(Number(tx.amount) || 0);
    total += amount;
    const cat = tx.category?.trim() || 'Inne';
    const cur = catMap.get(cat) ?? { total: 0, count: 0 };
    catMap.set(cat, { total: cur.total + amount, count: cur.count + 1 });
    topExpenses.push({
      id: tx.id,
      title: tx.counterparty_name?.trim() || tx.remittance?.trim() || 'Transakcja',
      amount,
      date: tx.booking_date || '',
      category: tx.category,
    });
  }
  topExpenses.sort((a, b) => b.amount - a.amount);
  const categories: ReviewExpenseCategory[] = Array.from(catMap.entries())
    .map(([category, val]) => ({ category, total: Math.round(val.total), count: val.count }))
    .sort((a, b) => b.total - a.total);
  return { total, count: valid.length, categories, topExpenses: topExpenses.slice(0, 5) };
}

function buildVoiceHighlights(rows: Sources[4]['data']): ReviewVoiceHighlight[] {
  return (rows ?? [])
    .filter((s) => s.content && s.content.trim().length > 0)
    .map((s) => {
      const meta = s.metadata as { voice_duration_seconds?: number; emotion?: { from_voice?: boolean } } | null;
      return {
        id: s.id,
        content: s.content?.trim() ?? '',
        createdAt: s.timestamp || s.created_at || '',
        isVoice: Boolean(meta?.voice_duration_seconds || meta?.emotion?.from_voice || s.source === 'telegram'),
      };
    });
}

function buildSprintGoals(
  weekStart: string,
  row: { goal_cialo: string | null; goal_duch: string | null; goal_konto: string | null; goal_text: string | null } | null,
): ReviewContext['sprintGoals'] {
  if (!row) return null;
  const goals = { cialo: trimmed(row.goal_cialo), duch: trimmed(row.goal_duch), konto: trimmed(row.goal_konto) };
  const summary = trimmed(row.goal_text) ?? null;
  if (!goals.cialo && !goals.duch && !goals.konto && !summary) return null;
  const sprint = getSprintInfoForDate(weekStart);
  return { label: `Sprint ${sprint.sprintNumber} · tydz. ${sprint.weekInSprint}/12`, goals, summary };
}

function parseAiRecap(raw: unknown): ReviewContext['aiRecap'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const phase1 = (raw as Record<string, unknown>).phase1 as Record<string, unknown> | undefined;
  if (!phase1 || typeof phase1.narrative !== 'string') return null;
  return {
    narrative: phase1.narrative,
    question: typeof phase1.question === 'string' ? phase1.question : undefined,
    longterm_motif: typeof phase1.longterm_motif === 'string' ? phase1.longterm_motif : null,
  };
}

export async function fetchWeekReviewContext(userId: string, due: DueReview): Promise<ReviewContext> {
  const [current, past, wins, txs, stream, scores, sleep, sprintRow, phone] = await fetchWeekSources(userId, due);
  if (current.error) throw current.error;
  const row = current.data;

  return {
    previousGoals: row
      ? { cialo: trimmed(row.week_goal_cialo), duch: trimmed(row.week_goal_duch), konto: trimmed(row.week_goal_konto) }
      : null,
    sprintGoals: buildSprintGoals(due.periodStart, sprintRow.data),
    ...buildScoreHistory(past.data ?? [], due.periodStart),
    days: buildReviewDays(due.periodStart, {
      wins: wins.data ?? [],
      scores: scores.data ?? [],
      sleep: sleep.data ?? [],
      phone: phone.data ?? [],
    }),
    tasks: buildTasks(wins.data),
    expenses: buildExpenses(txs.data),
    voiceHighlights: buildVoiceHighlights(stream.data),
    aiRecap: parseAiRecap(row?.ai_recap),
  };
}
