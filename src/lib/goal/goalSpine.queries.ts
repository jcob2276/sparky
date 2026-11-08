import { getTodayWarsaw } from '../date';
import { supabase } from '../supabase';
import type {
  WeeklyReviewRow,
  GoalSpine,
  GoalKpiRow,
} from './goalSpine.types';
import { queryClient } from '../queryClient';
import { goalSpineKeys } from '../queryKeys';
import { currentWeekStart } from './goalSpine.derive';
import {
  loadMonthlySlice,
  fetchWeekGoals,
  fetchSprintContext,
  fetchLongTermGoals,
  fetchSprintReview,
} from './goalSpine.loaders';

export * from './goalSpine.derive';
export * from './goalSpine.loaders';

export async function fetchWeeklyReviewFull(
  userId: string,
  weekStart: string,
): Promise<WeeklyReviewRow | null> {
  return queryClient.fetchQuery({
    queryKey: goalSpineKeys.review(userId, weekStart),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reviews')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export async function fetchLatestCompletedWeeklyReviewDate(userId: string): Promise<string | null> {
  return queryClient.fetchQuery({
    queryKey: goalSpineKeys.reviewLatestCompletedDate(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reviews')
        .select('review_completed_at')
        .eq('user_id', userId)
        .not('review_completed_at', 'is', null)
        .order('review_completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.review_completed_at ?? null;
    },
  });
}

export async function fetchGoalSpine(
  userId: string,
  weekStart: string = currentWeekStart(),
  today?: string,
): Promise<GoalSpine> {
  const currentToday = today ?? getTodayWarsaw();
  return queryClient.fetchQuery({
    queryKey: goalSpineKeys.full(userId, weekStart, currentToday),
    queryFn: async () => {
      const [week, sprint, longTerm, sprintReview, month] = await Promise.all([
        fetchWeekGoals(userId, weekStart),
        fetchSprintContext(userId),
        fetchLongTermGoals(userId),
        fetchSprintReview(userId),
        loadMonthlySlice(userId, today),
      ]);
      return { weekStart, sprint, month, week, longTerm, sprintReview };
    },
  });
}

export async function fetchKpisForProject(userId: string, projectId: string): Promise<GoalKpiRow[]> {
  return queryClient.fetchQuery({
    queryKey: goalSpineKeys.projectKpisFor(userId, projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_kpis')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId);
      if (error) throw error;
      return (data ?? []) as GoalKpiRow[];
    },
  });
}

const invalidateListeners = new Set<() => void>();

export function invalidateGoalSpineCache(userId: string): void {
  void queryClient.invalidateQueries({ queryKey: goalSpineKeys.forUser(userId) });
  // cele tygodniowe sprzedaży są czytane z `goal_kpis` (useCloserTargets), więc zmiana KPI musi je odświeżyć
  void queryClient.invalidateQueries({ queryKey: ['closer-targets', userId] });
  invalidateListeners.forEach((fn) => fn());
}

export function onGoalSpineInvalidated(listener: () => void): () => void {
  invalidateListeners.add(listener);
  return () => invalidateListeners.delete(listener);
}
