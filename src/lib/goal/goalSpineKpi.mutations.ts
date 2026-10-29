import { supabase } from '../supabase';
import { getTodayWarsaw, getWeekStartWarsaw } from '../date';
import type { GoalKpiRow, RollupDecision } from './goalSpine.types';
import { invalidateGoalSpineCache } from './goalSpine.queries';
import { fetchKpisForProject } from './goalSpine.queries';
import { fetchTodayTaskKpiBinding } from '../dailyWinTasksApi';

/** Closer weekly KPIs are absolute sums from closer_daily_logs — never delta-task or manual overwrite. */
async function isCloserAbsoluteKpi(kpiId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('goal_kpis')
    .select('id, projects!inner(name)')
    .eq('id', kpiId)
    .maybeSingle();
  if (error) throw error;
  const project = data?.projects as { name?: string } | { name?: string }[] | null | undefined;
  const name = Array.isArray(project) ? project[0]?.name : project?.name;
  return typeof name === 'string' && /closer/i.test(name);
}

export async function addProjectKpi(
  userId: string,
  projectId: string,
  pillar: string,
  fields: { name: string; unit: string; target?: number | null },
): Promise<GoalKpiRow> {
  const { data, error } = await supabase
    .from('goal_kpis')
    .insert({
      user_id: userId,
      project_id: projectId,
      pillar,
      name: fields.name.trim(),
      unit: fields.unit.trim(),
      target: fields.target ?? null,
      higher_is_better: true,
    })
    .select()
    .single();
  if (error) throw error;
  invalidateGoalSpineCache(userId);
  return data;
}

export async function setProjectKpiTarget(userId: string, kpiId: string, target: number | null): Promise<void> {
  const { error } = await supabase.from('goal_kpis').update({ target }).eq('id', kpiId);
  if (error) throw error;
  invalidateGoalSpineCache(userId);
}

/** Pure decision: does this daily task completion roll up into a project KPI? */
export function rollupTaskCompletion(
  targetValue: string | null | undefined,
  projectKpis: GoalKpiRow[] | null | undefined,
  sign: 1 | -1,
  preferredKpiId?: string | null,
): RollupDecision {
  const trimmed = targetValue?.trim();
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) return null;
  if (!projectKpis?.length) return null;

  const picked = pickRollupKpi(projectKpis, preferredKpiId);
  if (!picked) return null;

  const amount = parseFloat(trimmed);
  if (!Number.isFinite(amount) || amount === 0) return null;
  return { kpiId: picked.id, delta: amount * sign };
}

function pickRollupKpi(
  kpis: GoalKpiRow[],
  preferredKpiId?: string | null,
): GoalKpiRow | null {
  if (!kpis.length) return null;
  if (preferredKpiId) {
    const hit = kpis.find((k) => k.id === preferredKpiId);
    if (hit) return hit;
  }
  if (kpis.length === 1) return kpis[0];
  const scored = kpis
    .filter((k) => k.target != null && Number.isFinite(k.target) && k.target > 0)
    .sort((a, b) => (b.target ?? 0) - (a.target ?? 0));
  return scored[0] ?? kpis[0];
}

export async function applyKpiRollup(
  userId: string,
  kpiId: string,
  weekStart: string,
  delta: number,
): Promise<void> {
  if (await isCloserAbsoluteKpi(kpiId)) {
    throw new Error('KPI Closera pochodzi z logów dnia — nie z odhaczeń zadań.');
  }
  const { error } = await supabase.rpc('increment_kpi_entry_for_week', {
    p_kpi_id: kpiId,
    p_week_start: weekStart,
    p_delta: delta,
  });
  if (error) throw error;
  invalidateGoalSpineCache(userId);
}

/**
 * When a linked Todo flips done today, apply the same PowerList KPI delta (DC-02).
 * Trigger already mirrors done ↔ daily_win_tasks; this only covers the KPI side-effect.
 */
export async function applyKpiRollupForLinkedTodo(
  userId: string,
  todoId: string,
  sign: 1 | -1,
): Promise<void> {
  const today = getTodayWarsaw();
  const task = await fetchTodayTaskKpiBinding(userId, todoId, today);
  if (!task?.project_id || !task.target_value) return;

  const kpis = await fetchKpisForProject(userId, task.project_id);
  const decision = rollupTaskCompletion(task.target_value, kpis, sign, task.kpi_id);
  if (!decision) return;
  await applyKpiRollup(userId, decision.kpiId, getWeekStartWarsaw(today), decision.delta);
}
