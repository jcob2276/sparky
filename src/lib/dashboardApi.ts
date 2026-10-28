import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { fetchDailyWinTasksForDay } from './dailyWinTasksApi';
import { getTodayWarsaw, getWeekStartWarsaw } from './date';
import { SparkyCore, computeSignals } from './vanguardCore';
import { syncCalendar } from './syncApi';
import { parseWorldState } from './db-json-guards';
import type { Tables } from './database.types';

type TodayWinRow = Tables<'daily_wins'> & { daily_win_tasks?: Tables<'daily_win_tasks'>[] };

// Mirror of the WorldState interface from supabase/functions/_shared/worldState.ts
export type WorldState = {
  biometrics: { readiness_score: number | null; oura_history: unknown[] | null };
  execution:  { today_win: TodayWinRow | null };
  training:   { has_workout_today: boolean };
  nutrition:  { weekly_calories: number | null; protein_today: number | null };
};

export interface DashboardData {
  weeklyCalories: number;
  todayWin: TodayWinRow | null;
}

import { dashboardKeys } from './queryKeys';

/**
 * Live today's protein sum (daily_food_entries, daily_nutrition fallback) — feeds the core state signals in the live path.
 */
async function fetchLiveProteinToday(userId: string, today: string): Promise<number> {
  const [entriesRes, nutritionRes] = await Promise.all([
    supabase
      .from('daily_food_entries')
      .select('protein')
      .eq('user_id', userId)
      .eq('date', today),
    supabase
      .from('daily_nutrition')
      .select('protein')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle(),
  ]);

  const entries = entriesRes.data ?? [];
  if (entries.length > 0) {
    const total = entries.reduce((sum, row) => sum + (Number(row.protein) || 0), 0);
    return Math.round(total * 10) / 10;
  }

  return Number(nutritionRes.data?.protein) || 0;
}

/**
 * Fetch dashboard data: checks cached world state first, falls back to live queries and vanguard core state determination.
 */
async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const today = getTodayWarsaw();
  const monday = getWeekStartWarsaw(today);

  // 1. Fetch from cached world state table first
  const { data: wsRow } = await supabase
    .from('vanguard_world_state')
    .select('state_json')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (wsRow?.state_json) {
    const state = parseWorldState(wsRow.state_json);
    if (!state) {
      // state_json has unexpected structure — DB schema may have changed.
      // Fall through to live computation below.
      console.warn('[dashboardApi] world state JSON failed validation — falling back to live computation');
    } else {
      // live today_win and weekly calories: world_state is rebuilt once a night, so meals and ticks
      // from today would otherwise show only after the next rebuild
      const [{ data: liveTodayWin, error: winError }, { data: weekNutrition, error: weekNutritionError }] = await Promise.all([
        fetchDailyWinTasksForDay(userId, today),
        supabase.from('daily_nutrition').select('calories').eq('user_id', userId).gte('date', monday).lte('date', today),
      ]);
      if (winError) throw winError;
      const liveWeeklyCalories = weekNutritionError
        ? null
        : (weekNutrition ?? []).reduce((sum, row) => sum + (Number(row.calories) || 0), 0);

      return {
        weeklyCalories: liveWeeklyCalories ?? state.nutrition?.weekly_calories ?? 0,
        todayWin: liveTodayWin,
      };
    }
  }

  // 2. Fallback to live computation if cached row is missing or there's an error
  console.debug('[dashboardApi] Cached world state missing, falling back to live calculation');

  const [
    nutritionRes,
    tDataRes,
    liveProtein,
    ouraDataRes,
    lastWorkoutRes
  ] = await Promise.all([
    supabase.from('daily_nutrition').select('calories').eq('user_id', userId).gte('date', monday),
    fetchDailyWinTasksForDay(userId, today),
    fetchLiveProteinToday(userId, today),
    supabase.from('oura_daily_summary').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(30),
    supabase.from('workout_sessions').select('date').eq('user_id', userId).order('date', { ascending: false }).limit(1).maybeSingle()
  ]);

  const nutrition = nutritionRes.data;
  if (tDataRes.error) throw tDataRes.error;
  const tData = tDataRes.data;
  const ouraData = ouraDataRes.data;
  const lastWorkout = lastWorkoutRes.data;

  const totalCal = nutrition?.reduce((sum, n) => sum + (n.calories || 0), 0) || 0;

  // --- SPARKY CORE ENGINE ---
  const core = new SparkyCore(userId, supabase);

  const signals = computeSignals(
    ouraData?.[0] || null,
    tData,
    { protein: liveProtein },
    lastWorkout?.date || null
  );

  await core.determineState(signals);

  return {
    weeklyCalories: totalCal,
    todayWin: tData,
  };
}

/**
 * Custom React Query hook for accessing dashboard data
 */
export function useDashboardQuery(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.main(userId || ''),
    queryFn: () => fetchDashboardData(userId || ''),
    enabled: !!userId && enabled,
    staleTime: 1000 * 30,
  });
}

/**
 * Fetch the start time of the last calendar event to check sync status
 */
export async function getLastCalendarEventStartTime(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('vanguard_calendar')
    .select('start_time')
    .eq('user_id', userId)
    .lte('start_time', new Date().toISOString())
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.start_time ?? null;
}

/**
 * Triggers calendar synchronization for the user
 */
export async function syncUserCalendar(userId: string): Promise<void> {
  await syncCalendar(userId);
}

/**
 * Record user view navigation event into view_events table
 */
export async function recordViewEvent(userId: string, viewName: string): Promise<void> {
  const { error } = await supabase
    .from('view_events')
    .insert({ user_id: userId, view_name: viewName });
  if (error) throw error;
}

