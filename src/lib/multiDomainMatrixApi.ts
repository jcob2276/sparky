import { supabase } from './supabase';

interface MatrixNutritionRow {
  date: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface MatrixOuraRow {
  date: string;
  sleep_score: number | null;
  total_sleep_hours: number | null;
  hrv_avg: number | null;
  readiness_score: number | null;
}

interface MatrixDailyWinRow {
  date: string;
  task_1: string | null;
  task_2: string | null;
  task_3: string | null;
  task_4: string | null;
  task_5: string | null;
  done_1: boolean | null;
  done_2: boolean | null;
  done_3: boolean | null;
  done_4: boolean | null;
  done_5: boolean | null;
  result: string | null;
}

interface MatrixHabitLogRow {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
}

export interface MultiDomainMatrixApiResult {
  nutrition: MatrixNutritionRow[];
  oura: MatrixOuraRow[];
  wins: MatrixDailyWinRow[];
  habitLogs: MatrixHabitLogRow[];
}

export async function fetchMultiDomainMatrixApi(
  userId: string,
  startDate: string
): Promise<MultiDomainMatrixApiResult> {
  const [nutritionRes, ouraRes, winsRes, habitLogsRes] = await Promise.all([
    supabase
      .from('daily_nutrition')
      .select('date, calories, protein, carbs, fat')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date', { ascending: true }),

    supabase
      .from('oura_daily_summary')
      .select('date, sleep_score, total_sleep_hours, hrv_avg, readiness_score')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date', { ascending: true }),

    supabase
      .from('daily_wins')
      .select('date, task_1, task_2, task_3, task_4, task_5, done_1, done_2, done_3, done_4, done_5, result')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date', { ascending: true }),

    supabase
      .from('habit_logs')
      .select('id, habit_id, date, completed')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date', { ascending: true }),
  ]);

  return {
    nutrition: (nutritionRes.data || []) as MatrixNutritionRow[],
    oura: (ouraRes.data || []) as MatrixOuraRow[],
    wins: (winsRes.data || []) as MatrixDailyWinRow[],
    habitLogs: (habitLogsRes.data || []) as MatrixHabitLogRow[],
  };
}
