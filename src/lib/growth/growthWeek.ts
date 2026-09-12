import type { LearningSkill, LearningWeekFocus } from './growth';
import { shiftWeekStart, partitionSkillTree } from './growth';
import { supabase } from '../supabase';

export interface WeekDirectionGoals {
  intention: string | null;
  commitment: string | null;
  cialo: string | null;
  duch: string | null;
  konto: string | null;
}

export interface PowerListWeekStats {
  daysLogged: number;
  daysWithWins: number;
  tasksDone: number;
  tasksSet: number;
}

export interface GrowthPrevWeekSummary {
  weekStart: string;
  focusLabel: string | null;
  focusTarget: number | null;
  mustDone: number;
  mustTotal: number;
  focusScore: number | null;
}

export function getWeekEndExclusive(weekStart: string): string {
  return shiftWeekStart(weekStart, 1);
}

export function computePowerListWeekStats(
  rows: Array<{
    daily_win_tasks?: Array<{ slot: number; title: string | null; done: boolean | null }> | null;
    done_1?: boolean | null;
    done_2?: boolean | null;
    done_3?: boolean | null;
    done_4?: boolean | null;
    done_5?: boolean | null;
    task_1?: string | null;
    task_2?: string | null;
    task_3?: string | null;
    task_4?: string | null;
    task_5?: string | null;
  }>,
): PowerListWeekStats {
  let daysWithWins = 0;
  let tasksDone = 0;
  let tasksSet = 0;

  for (const row of rows) {
    let dayDone = 0;
    if (row.daily_win_tasks?.length) {
      for (const t of row.daily_win_tasks) {
        if (!t.title?.trim()) continue;
        tasksSet++;
        if (t.done) {
          tasksDone++;
          dayDone++;
        }
      }
    } else {
      for (let i = 1; i <= 5; i++) {
        const task = row[`task_${i}` as keyof typeof row] as string | null | undefined;
        const done = row[`done_${i}` as keyof typeof row] as boolean | null | undefined;
        if (task?.trim()) {
          tasksSet++;
          if (done) {
            tasksDone++;
            dayDone++;
          }
        }
      }
    }
    if (dayDone > 0) daysWithWins++;
  }

  return { daysLogged: rows.length, daysWithWins, tasksDone, tasksSet };
}

/** Najbliższy snapshot w obrębie tygodnia (date >= weekStart, < weekEnd). */
function pickSnapshotInWeek(
  snapshots: { snapshot_date: string; scores: Record<string, number> }[],
  weekStart: string,
): { snapshot_date: string; scores: Record<string, number> } | null {
  const weekEnd = getWeekEndExclusive(weekStart);
  const inWeek = snapshots
    .filter((s) => s.snapshot_date >= weekStart && s.snapshot_date < weekEnd)
    .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date));
  return inWeek[0] ?? null;
}

export function focusScoreForWeek(
  parents: LearningSkill[],
  snapshots: { snapshot_date: string; scores: Record<string, number> }[],
  weekStart: string,
  focus: Pick<LearningWeekFocus, 'skill_id'> | null,
): number | null {
  if (!focus?.skill_id) return null;
  const skill = parents.find((s) => s.id === focus.skill_id);
  if (!skill) return null;
  const snap = pickSnapshotInWeek(snapshots, weekStart);
  return snap?.scores[skill.key] ?? null;
}

function summarizePins(pins: Array<{ slot: string; done: boolean }>) {
  return {
    mustDone: pins.filter((p) => p.slot === 'must' && p.done).length,
    mustTotal: pins.filter((p) => p.slot === 'must').length,
    activeDone: pins.filter((p) => p.slot === 'active' && p.done).length,
    activeTotal: pins.filter((p) => p.slot === 'active').length,
  };
}

export async function fetchGrowthPrevWeekSummary(
  userId: string,
  weekStart: string,
): Promise<GrowthPrevWeekSummary | null> {
  const prevStart = shiftWeekStart(weekStart, -1);
  const [skillsRes, focusRes, pinsRes, snapshotsRes] = await Promise.all([
    supabase.from('learning_skills').select('*').eq('user_id', userId).eq('active', true),
    supabase
      .from('learning_week_focus')
      .select('skill_id, target_level')
      .eq('user_id', userId)
      .eq('week_start', prevStart)
      .maybeSingle(),
    supabase.from('learning_week_pins').select('slot, done').eq('user_id', userId).eq('week_start', prevStart),
    supabase
      .from('learning_skill_snapshots')
      .select('snapshot_date, scores')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(12),
  ]);

  const skills = ((skillsRes.data ?? []) as LearningSkill[]).map((s) => ({
    ...s,
    parent_id: s.parent_id ?? null,
  }));
  const { parents } = partitionSkillTree(skills);
  const focus = focusRes.data;
  const focusSkill = parents.find((s) => s.id === focus?.skill_id);
  const pinStats = summarizePins((pinsRes.data ?? []) as { slot: string; done: boolean }[]);
  const snapshots = (snapshotsRes.data ?? []).map((s) => ({
    snapshot_date: s.snapshot_date as string,
    scores: (s.scores as Record<string, number>) ?? {},
  }));

  if (!focusSkill && pinStats.mustTotal === 0) return null;

  return {
    weekStart: prevStart,
    focusLabel: focusSkill?.label ?? null,
    focusTarget: focus?.target_level ?? null,
    mustDone: pinStats.mustDone,
    mustTotal: pinStats.mustTotal,
    focusScore: focusScoreForWeek(parents, snapshots, prevStart, focus),
  };
}

