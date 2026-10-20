import { supabase } from '../supabase';
import { fetchLinks, type SavedLink } from '../linksApi';
import type { Tables, TablesInsert } from '../database.types';
import type { LearningAssignment, LearningResourceType, LearningUnit } from './learningModel';

export interface MonthPlan {
  assignments: LearningAssignment[];
  /** Ilość zapisana na dzisiaj, wg id pozycji. */
  loggedToday: Record<string, number>;
}

export async function fetchMonthPlan(userId: string, monthStart: string, today: string): Promise<MonthPlan> {
  const { data, error } = await supabase
    .from('learning_assignments')
    .select('*')
    .eq('user_id', userId)
    .eq('month_start', monthStart)
    .neq('status', 'dropped')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  const assignments = data ?? [];
  if (!assignments.length) return { assignments, loggedToday: {} };

  const { data: logs, error: logError } = await supabase
    .from('learning_progress_log')
    .select('assignment_id, amount')
    .eq('user_id', userId)
    .eq('date', today)
    .in('assignment_id', assignments.map((a) => a.id));
  if (logError) throw logError;
  const loggedToday: Record<string, number> = {};
  for (const row of logs ?? []) loggedToday[row.assignment_id] = Number(row.amount);
  return { assignments, loggedToday };
}

export interface NewAssignment {
  monthStart: string;
  title: string;
  resourceType: LearningResourceType;
  unit: LearningUnit;
  total: number;
  dueDate: string;
  linkId?: string | null;
  skillId?: string | null;
  position: number;
}

export async function createAssignment(userId: string, input: NewAssignment): Promise<LearningAssignment> {
  const row: TablesInsert<'learning_assignments'> = {
    user_id: userId,
    month_start: input.monthStart,
    title: input.title.trim(),
    resource_type: input.resourceType,
    unit: input.unit,
    total: input.total,
    due_date: input.dueDate,
    link_id: input.linkId ?? null,
    skill_id: input.skillId ?? null,
    position: input.position,
  };
  const { data, error } = await supabase.from('learning_assignments').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function dropAssignment(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('learning_assignments')
    .update({ status: 'dropped' })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

/** Ilość zrobiona danego dnia (idempotentnie: ta sama data nadpisuje, 0 cofa). Przelicza postęp w bazie. */
export async function logLearningProgress(assignmentId: string, date: string, amount: number): Promise<LearningAssignment> {
  const { data, error } = await supabase.rpc('log_learning_progress', {
    p_assignment_id: assignmentId,
    p_date: date,
    p_amount: amount,
  });
  if (error) throw error;
  return data;
}

/** Nieprzeczytane z Pocket, które nie są jeszcze w tym miesiącu. */
export async function fetchPocketCandidates(userId: string, excludeLinkIds: string[]): Promise<SavedLink[]> {
  const links = await fetchLinks(supabase, userId);
  const excluded = new Set(excludeLinkIds);
  return links.filter((link) => link.status === 'unread' && !excluded.has(link.id));
}

export type LearningSkill = Pick<Tables<'learning_skills'>, 'id' | 'label' | 'sort_order'>;

export async function fetchTopSkills(userId: string): Promise<LearningSkill[]> {
  const { data, error } = await supabase
    .from('learning_skills')
    .select('id, label, sort_order')
    .eq('user_id', userId)
    .eq('active', true)
    .is('parent_id', null)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Skończone i odpuszczone z poprzednich miesięcy, najnowsze najpierw. */
export async function fetchPastAssignments(userId: string, beforeMonthStart: string, limit = 12): Promise<LearningAssignment[]> {
  const { data, error } = await supabase
    .from('learning_assignments')
    .select('*')
    .eq('user_id', userId)
    .lt('month_start', beforeMonthStart)
    .order('month_start', { ascending: false })
    .order('position', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
