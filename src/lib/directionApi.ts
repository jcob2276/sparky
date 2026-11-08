/**
 * DAL for Direction view — keeps supabase.from out of components.
 * Hooks under components/.../hooks may orchestrate, but table access lives here.
 */
import { supabase } from './supabase';
import { fetchDailyWinTasks } from './dailyWinTasksApi';

export async function fetchActiveProjects(userId: string): Promise<Array<{
  id: string;
  name: string;
  goal: string | null;
  status: string;
  primary_skill_id?: string | null;
}>> {
  const withSkill = await supabase
    .from('projects')
    .select('id, name, goal, status, primary_skill_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (!withSkill.error) {
    return (withSkill.data ?? []) as Array<{
      id: string;
      name: string;
      goal: string | null;
      status: string;
      primary_skill_id?: string | null;
    }>;
  }

  const fallback = await supabase
    .from('projects')
    .select('id, name, goal, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (fallback.error) throw fallback.error;
  return (fallback.data ?? []).map((p) => ({ ...p, primary_skill_id: null }));
}

export async function fetchDirectionWeekBoard(userId: string, weekStart: string, weekEnd: string, weekFromISO: string) {
  const results = await Promise.all([
    supabase.from('learning_week_pins').select('id, slot, done, entity_type, entity_id, manual_title, project_id').eq('user_id', userId).eq('week_start', weekStart).order('sort_order'),
    supabase.from('goal_kpis').select('id, project_id, name, target').eq('user_id', userId),
    fetchDailyWinTasks(userId, { from: weekStart, before: weekEnd }),
    supabase.from('learning_week_focus').select('skill_id, subskill_id, target_level').eq('user_id', userId).eq('week_start', weekStart).maybeSingle(),
    supabase.from('learning_skills').select('id, key, label, parent_id').eq('user_id', userId).eq('active', true),
    supabase.from('vanguard_links').select('id, title').eq('user_id', userId).limit(80),
    supabase.from('todo_items').select('id, title, priority, due_date, section_id, status').eq('user_id', userId).neq('status', 'done').order('created_at', { ascending: false }).limit(60),
    supabase.from('todo_sections').select('id, project_id').eq('user_id', userId),
    supabase.from('todo_items').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_milestone', true).eq('status', 'done').gte('completed_at', weekFromISO),
    supabase.from('todo_items').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_milestone', true).in('status', ['pending', 'open']).lte('due_date', weekEnd),
  ]);

  for (const res of results) {
    if (res.error) throw res.error;
  }
  return results;
}
