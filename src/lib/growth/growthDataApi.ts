import { supabase } from '../supabase';
import {
  partitionSkillTree,
  type LearningSkill,
  type LearningWeekFocus,
  type LearningWeekPin,
} from './growth';
import { insertDefaultSkillTree } from './growthSeed';
import { fetchGoalSpine, fetchLatestKpiValues } from '../goal/goalSpine';
import { warsawDayBoundsISO } from '../date';
import {
  computePowerListWeekStats,
  focusScoreForWeek,
  getWeekEndExclusive,
  type WeekDirectionGoals,
  fetchGrowthPrevWeekSummary,
} from './growthWeek';
import type {
  GrowthLinkRow,
  GrowthWeekNote,
  GrowthTodoRow,
  GrowthProjectSummary,
  GrowthCheckpoint,
  GrowthContextData,
  GrowthDataResult,
  VanguardIdentityData,
} from './growth.types';

function buildActiveProjects(
  activeProjectRows: Array<{ id: string; name: string; goal: string | null; status: string; primary_skill_id: string | null }>,
  allKpis: Array<{ id: string; project_id?: string | null; name?: string; target?: number | null }>,
  latestKpiValues: Map<string, number | null>
): GrowthProjectSummary[] {
  return activeProjectRows.map((p) => ({
    id: p.id,
    name: p.name,
    goal: p.goal ?? null,
    status: p.status,
    primarySkillId: p.primary_skill_id ?? null,
    kpis: allKpis
      .filter((k) => k.project_id === p.id)
      .map((k) => ({
        id: k.id,
        name: k.name ?? 'KPI',
        current: latestKpiValues.get(k.id) ?? null,
        target: k.target ?? null,
      })),
  }));
}

function buildUpcomingCheckpoints(
  checkpointRowsRaw: Array<{ id: string; project_id: string | null; title: string; due_date: string | null; status: string }>,
  activeProjectRows: Array<{ id: string; name: string }>,
  todayStr: string
): GrowthCheckpoint[] {
  const checkpointRows = checkpointRowsRaw.filter(
    (cp): cp is typeof cp & { project_id: string; due_date: string } =>
      cp.project_id != null && cp.due_date != null
  );
  const projNameMap = new Map(activeProjectRows.map((p) => [p.id, p.name]));
  return checkpointRows
    .filter((cp) => projNameMap.has(cp.project_id))
    .map((cp) => {
      const diffMs = new Date(cp.due_date).getTime() - new Date(todayStr).getTime();
      const daysOverdue = -Math.round(diffMs / (1000 * 60 * 60 * 24));
      return {
        id: cp.id,
        project_id: cp.project_id,
        project_name: projNameMap.get(cp.project_id) ?? '',
        title: cp.title,
        due_date: cp.due_date,
        status: cp.status,
        daysOverdue,
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

function buildGrowthContext(
  spine: Awaited<ReturnType<typeof fetchGoalSpine>>,
  activeProjects: GrowthProjectSummary[],
  allKpis: Array<{ id: string; project_id?: string | null; name?: string; target?: number | null }>,
  latestKpiValues: Map<string, number | null>
): GrowthContextData {
  const activeProject = activeProjects[0] ?? null;
  const projectKpis = allKpis.filter((k) => k.project_id === activeProject?.id);
  const firstKpi = projectKpis[0];
  const weekResolved = spine.week;
  const sprint = spine.sprint;

  const weekGoals: WeekDirectionGoals = {
    intention: weekResolved.intention,
    commitment: weekResolved.commitment,
    cialo: weekResolved.cialo,
    duch: weekResolved.duch,
    konto: weekResolved.konto,
  };

  return {
    weekIntention: weekGoals.intention || weekGoals.commitment || null,
    weekCommitment: weekGoals.commitment,
    weekGoals,
    sprintGoal: sprint.goalText,
    sprintLabel: sprint.label,
    activeProjectName: activeProject?.name ?? null,
    kpiName: firstKpi?.name || null,
    kpiValue: firstKpi ? latestKpiValues.get(firstKpi.id) ?? null : null,
    kpiTarget: firstKpi?.target ?? null,
    kpiId: firstKpi?.id ?? null,
  };
}

export async function fetchGrowthDashboardData(
  userId: string,
  weekStart: string
): Promise<GrowthDataResult> {
  const { data: existing } = await supabase
    .from('learning_skills')
    .select('id')
    .eq('user_id', userId)
    .eq('active', true)
    .limit(1);
  if (!existing || existing.length === 0) {
    await insertDefaultSkillTree(supabase, userId);
  }

  const { fromISO: weekFromISO } = warsawDayBoundsISO(weekStart);
  const weekEnd = getWeekEndExclusive(weekStart);

  const [
    skillsRes, snapshotsRes, focusRes, pinsRes,
    unreadRes, readRes, todosRes, spine,
    projectsRes, kpisRes, rozwojNotesRes, dailyWinsRes,
    checkpointsRes, prevWeekRes, identityRes,
  ] = await Promise.all([
    supabase.from('learning_skills').select('*').eq('user_id', userId).eq('active', true).order('sort_order'),
    supabase.from('learning_skill_snapshots').select('id, snapshot_date, scores').eq('user_id', userId).order('snapshot_date', { ascending: false }).limit(24),
    supabase.from('learning_week_focus').select('week_start, skill_id, subskill_id, why_text, drill_text, target_level, rep_target, rep_done, lateral_challenge, vertical_challenge').eq('user_id', userId).eq('week_start', weekStart).maybeSingle(),
    supabase.from('learning_week_pins').select('*').eq('user_id', userId).eq('week_start', weekStart).order('slot').order('sort_order'),
    supabase.from('vanguard_links').select('id, url, title, status, category, resource_type, thumbnail_url, domain').eq('user_id', userId).eq('status', 'unread').order('created_at', { ascending: false }).limit(40),
    supabase.from('vanguard_links').select('id, url, title, status, category, resource_type, thumbnail_url, domain, updated_at').eq('user_id', userId).eq('status', 'read').order('updated_at', { ascending: false }).limit(40),
    supabase.from('todo_items').select('id, title, status').eq('user_id', userId).neq('status', 'done').order('created_at', { ascending: false }).limit(40),
    fetchGoalSpine(userId, weekStart),
    supabase.from('projects').select('id, name, goal, status, primary_skill_id').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(24),
    supabase.from('goal_kpis').select('*').eq('user_id', userId).order('sort_order'),
    supabase.from('vanguard_notes').select('id, title, created_at').eq('user_id', userId).contains('tags', ['rozwoj']).gte('created_at', weekFromISO).order('created_at', { ascending: false }).limit(20),
    supabase.from('daily_wins').select('task_1, task_2, task_3, task_4, task_5, done_1, done_2, done_3, done_4, done_5, date, daily_win_tasks(slot, title, done)').eq('user_id', userId).gte('date', weekStart).lt('date', weekEnd),
    supabase.from('todo_items').select('id, project_id, title, due_date, status').eq('user_id', userId).eq('is_milestone', true).in('status', ['pending', 'open']).order('due_date', { ascending: true }).limit(10),
    fetchGrowthPrevWeekSummary(userId, weekStart),
    supabase.from('vanguard_identity').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  const skills = (((skillsRes.data as LearningSkill[]) ?? []).map((s) => ({ ...s, parent_id: s.parent_id ?? null })));
  const snapshots = ((snapshotsRes.data ?? []).map((r) => ({ id: r.id, snapshot_date: r.snapshot_date, scores: (r.scores as Record<string, number>) ?? {} })));
  const activeProjectRows = projectsRes.data ?? [];
  const allKpis = (kpisRes.data ?? []) as Array<{ id: string; project_id?: string | null; name?: string; target?: number | null }>;
  const latestKpiValues = await fetchLatestKpiValues(userId, allKpis.map((k) => k.id));

  const activeProjects = buildActiveProjects(activeProjectRows, allKpis, latestKpiValues);
  const upcomingCheckpoints = buildUpcomingCheckpoints(
    (checkpointsRes.data ?? []) as Array<{ id: string; project_id: string | null; title: string; due_date: string | null; status: string }>,
    activeProjectRows,
    weekStart
  );
  const context = buildGrowthContext(spine, activeProjects, allKpis, latestKpiValues);

  const focus = (focusRes.data as LearningWeekFocus | null) ?? null;
  const weekNotes = (rozwojNotesRes.data as GrowthWeekNote[]) ?? [];
  const { parents } = partitionSkillTree(skills);
  const snapRows = snapshots.map((r) => ({ snapshot_date: r.snapshot_date, scores: r.scores }));
  const weekFocusScore = focusScoreForWeek(parents, snapRows, weekStart, focus);

  return {
    skills,
    snapshots,
    focus,
    pins: (pinsRes.data as LearningWeekPin[]) ?? [],
    unreadLinks: (unreadRes.data as GrowthLinkRow[]) ?? [],
    readLinks: (readRes.data as GrowthLinkRow[]) ?? [],
    openTodos: (todosRes.data as GrowthTodoRow[]) ?? [],
    context,
    rozwojNotesCount: weekNotes.length,
    weekNotes,
    powerListStats: computePowerListWeekStats(dailyWinsRes.data ?? []),
    prevWeekSummary: prevWeekRes,
    weekFocusScore,
    activeProjects,
    upcomingCheckpoints,
    identity: (identityRes.data as VanguardIdentityData | null) ?? null,
  };
}
