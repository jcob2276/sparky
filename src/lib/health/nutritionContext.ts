import { supabase, invokeEdge } from '../supabase';
import { getTodayWarsaw, formatWarsawDate, warsawDayBoundsISO, warsawTimeOfDay } from '../date';
import type { TodayNutritionSnapshot } from './foodLogging';
import { TIMEOUTS } from '../constants';
import { estimateCaffeineMg } from '@vanguard/domain';
import { isRunSport } from '../runSports';

type NutritionTrajectory = 'on_track' | 'behind' | 'ahead';

export interface NutritionDayContext extends TodayNutritionSnapshot {
  date: string;
  carbs: number;
  fat: number;
  lastMealAt?: string | null;
  lastCaffeineAt?: string | null;
  caffeineMg?: number | null;
  addBackKcal: number;
  deficitKcal: number;
  inTaper: boolean;
  daysToMarathon: number | null;
  goalBodyFat: number | null;
  currentBodyFatEst: number | null;
  goalWeightKg: number | null;
  currentWeightKg: number | null;
  eventName: string | null;
  trajectory: NutritionTrajectory | null;
  trajectoryNote: string | null;
  todayFocus: string | null;
  trainingLabel: string;
  runKmToday: number;
  gymToday: boolean;
  weightTrendKgWeek: number | null;
  plannedWeeklyLossKg: number | null;
  forecastWeight90d: number | null;
  forecastBf90d: number | null;
  daysToGoalEst: number | null;
  maintenanceKcal: number | null;
  foodDataState: 'missing' | 'logged';
  foodComplete: boolean;
  targetUpdatedAt: string | null;
  targetError?:string|null;
}

/** Implied goal weight from constant lean mass + target BF% (same model as nutrition-coach). */
function impliedGoalWeightKg(
  currentWeightKg: number | null,
  currentBfPct: number | null,
  goalBfPct: number | null,
): number | null {
  if (
    currentWeightKg == null ||
    currentBfPct == null ||
    goalBfPct == null ||
    goalBfPct <= 0 ||
    goalBfPct >= 100 ||
    currentBfPct <= goalBfPct
  ) {
    return null;
  }
  const lean = currentWeightKg * (1 - currentBfPct / 100);
  return Math.round((lean / (1 - goalBfPct / 100)) * 10) / 10;
}

type SignalsInputs = {
  profile?: {
    goal_body_fat?: number | null;
    current_body_fat_est?: number | null;
    event_name?: string | null;
    event_date?: string | null;
    days_to_event?: number | null;
    in_taper?: boolean;
    weekly_loss_kg?: number | null;
  };
  body?: { weight?: number | null };
  today?: {
    add_back_kcal?: number | null;
    deficit_kcal?: number | null;
  };
  activity?: { run_km_30d?: number | null };
};

function parseVerdict(verdict: unknown): {
  trajectory: NutritionTrajectory | null;
  trajectoryNote: string | null;
  todayFocus: string | null;
} {
  if (!verdict || typeof verdict !== 'object' || Array.isArray(verdict)) {
    return { trajectory: null, trajectoryNote: null, todayFocus: null };
  }
  const v = verdict as Record<string, unknown>;
  const trajectory = v.trajectory;
  const valid =
    trajectory === 'on_track' || trajectory === 'behind' || trajectory === 'ahead'
      ? trajectory
      : null;
  return {
    trajectory: valid,
    trajectoryNote: typeof v.trajectory_note === 'string' ? v.trajectory_note : null,
    todayFocus: typeof v.today_focus === 'string' ? v.today_focus : null,
  };
}

function stravaDay(iso: string): string {
  return formatWarsawDate(iso);
}

function buildTrainingLabel(runKmToday: number, gymToday: boolean, addBackKcal: number): string {
  if (runKmToday >= 14) return `Long run · ${runKmToday.toFixed(1)} km`;
  if (runKmToday >= 1) return `Bieg · ${runKmToday.toFixed(1)} km`;
  if (gymToday) return 'Siła dziś';
  if (addBackKcal >= 80) return 'Aktywny dzień (Oura)';
  return 'Brak zapisanego treningu — sprawdź plan dnia';
}

async function ensureNutritionTargetForDate(
  userId: string,
  date: string,
  accessToken: string | undefined,
): Promise<string|null> {
  void accessToken; // Authorization comes from the shared Supabase client session.
  const today = getTodayWarsaw();
  if (date !== today) return null;

  const { data: existing,error } = await supabase
    .from('nutrition_targets')
    .select('date,target_kcal,protein_floor_g')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if(error) return error.message;
  if (existing?.target_kcal != null && existing.protein_floor_g != null) return null;

  try {
    await invokeEdge('vanguard-nutrition-coach', {
      body: { action:'refresh_targets',userId, date, notify: false },
      signal: AbortSignal.timeout(TIMEOUTS.heavy),
    });
    return null;
  } catch (e: unknown) {
      return e instanceof Error?e.message:'Nie udało się odświeżyć celu żywienia.';
    }
}

export async function fetchNutritionDayContext(
  userId: string,
  date: string,
  accessToken?: string,
): Promise<NutritionDayContext> {
  const targetError=await ensureNutritionTargetForDate(userId, date, accessToken);

  const { fromISO: dayStart, toISO: dayEnd } = warsawDayBoundsISO(date);

  const [dayRow, targetRow, profileRow, stravaRes, sessionsRes, review, foodRes] = await Promise.all([
    supabase
      .from('daily_nutrition')
      .select('calories, protein, carbs, fat, avg_food_quality, food_quality_analysis')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle(),
    supabase
      .from('nutrition_targets')
      .select(
        'target_kcal, protein_floor_g, deficit_kcal, est_maintenance_kcal, weight_trend_kg_per_week, forecast_90d_weight_kg, forecast_90d_bf_pct, days_to_goal_est, inputs, verdict, updated_at',
      )
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle(),
    supabase
      .from('nutrition_profile')
      .select('goal_body_fat, current_body_fat_est, event_name, event_date, weekly_loss_kg')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('strava_activities_clean')
      .select('sport_type, distance, start_date')
      .eq('user_id', userId)
      .eq('is_oura', false)
      .gte('start_date', dayStart)
      .lte('start_date', dayEnd),
    supabase
      .from('workout_sessions')
      .select('id, exercise_logs(exercise_name, muscle_tags)')
      .eq('user_id', userId)
      .eq('date', date),
    supabase.from('nutrition_day_reviews').select('completeness').eq('user_id',userId).eq('date',date).maybeSingle(),
    supabase
      .from('daily_food_entries')
      .select('name, calories, logged_at')
      .eq('user_id', userId)
      .eq('date', date)
      .order('logged_at'),
  ]);
  for (const result of [dayRow,targetRow,profileRow,stravaRes,sessionsRes,review,foodRes]) if (result?.error) throw result.error;
  const target = targetRow.data;

  const foodEntries = (foodRes?.data ?? []) as Array<{ name: string; calories: number | null; logged_at: string | null }>;
  const foodWithTimes = foodEntries.filter((e) => e.logged_at);
  const lastMeal = foodWithTimes.at(-1);
  const lastMealAt = lastMeal?.logged_at ? warsawTimeOfDay(lastMeal.logged_at) : null;
  const caffeineEntries = foodEntries
    .map((e) => ({ ...e, mg: estimateCaffeineMg(e.name) }))
    .filter((e) => e.mg > 0);
  const lastCaff = caffeineEntries.at(-1);
  const lastCaffeineAt = lastCaff?.logged_at ? warsawTimeOfDay(lastCaff.logged_at) : null;
  const caffeineMg = caffeineEntries.reduce((sum, e) => sum + e.mg, 0);

  const inputs = (target?.inputs ?? {}) as SignalsInputs;
  const verdictParsed = parseVerdict(target?.verdict);

  let runKmToday = 0;
  for (const a of stravaRes.data ?? []) {
    if (!isRunSport(a.sport_type)) continue;
    if (!a.start_date || stravaDay(a.start_date) !== date) continue;
    runKmToday += (Number(a.distance) || 0) / 1000;
  }
  runKmToday = Math.round(runKmToday * 10) / 10;

  const gymToday = (sessionsRes.data ?? []).some((s) => {
    const logs = (s as { exercise_logs?: Array<{ muscle_tags?: string[] | null }> }).exercise_logs ?? [];
    return logs.some((l) => !(l.muscle_tags ?? []).includes('wellness'));
  });

  const addBackKcal = Math.round(Number(inputs.today?.add_back_kcal) || 0);
  const profile = inputs.profile ?? {};
  const currentBodyFatEst =
    profileRow.data?.current_body_fat_est ?? profile.current_body_fat_est ?? null;
  const goalBodyFat = profileRow.data?.goal_body_fat ?? profile.goal_body_fat ?? null;
  const currentWeightKg = num(inputs.body?.weight) ?? null;
  const goalWeightKg = impliedGoalWeightKg(currentWeightKg, currentBodyFatEst, goalBodyFat);

  let daysToMarathon = profile.days_to_event ?? null;
  if (daysToMarathon == null && profileRow.data?.event_date) {
    const ev = new Date(`${profileRow.data.event_date}T12:00:00Z`).getTime();
    const d = new Date(`${date}T12:00:00Z`).getTime();
    daysToMarathon = Math.round((ev - d) / 86400000);
  }

  return {
    date,
    calories: dayRow.data?.calories ?? 0,
    protein: dayRow.data?.protein ?? 0,
    carbs: dayRow.data?.carbs ?? 0,
    fat: dayRow.data?.fat ?? 0,
    lastMealAt,
    lastCaffeineAt,
    caffeineMg: caffeineEntries.length > 0 ? caffeineMg : null,
    targetKcal: target?.target_kcal ?? null,
    targetProtein: target?.protein_floor_g ?? null,
    avgFoodQuality: dayRow.data?.avg_food_quality ?? null,
    foodQualityAnalysis: dayRow.data?.food_quality_analysis ?? null,
    addBackKcal,
    deficitKcal: target?.deficit_kcal ?? Math.round(Number(inputs.today?.deficit_kcal) || 0),
    inTaper: profile.in_taper === true,
    daysToMarathon,
    goalBodyFat,
    currentBodyFatEst,
    goalWeightKg,
    currentWeightKg,
    eventName: profileRow.data?.event_name ?? profile.event_name ?? null,
    trajectory: verdictParsed.trajectory,
    trajectoryNote: verdictParsed.trajectoryNote,
    todayFocus: verdictParsed.todayFocus,
    trainingLabel: buildTrainingLabel(runKmToday, gymToday, addBackKcal),
    runKmToday,
    gymToday,
    weightTrendKgWeek: target?.weight_trend_kg_per_week ?? null,
    plannedWeeklyLossKg:
      profileRow.data?.weekly_loss_kg ?? profile.weekly_loss_kg ?? null,
    forecastWeight90d: target?.forecast_90d_weight_kg ?? null,
    forecastBf90d: target?.forecast_90d_bf_pct ?? null,
    daysToGoalEst: target?.days_to_goal_est ?? null,
    maintenanceKcal: target?.est_maintenance_kcal ?? null,
    foodDataState: dayRow.data ? 'logged' : 'missing',
    foodComplete: review.data?.completeness === 'complete',
    targetUpdatedAt: target?.updated_at ?? null,
    targetError,
  };
}

function num(v: unknown): number | null {
  if (v == null || Number.isNaN(Number(v))) return null;
  const n = Number(v);
  return n > 0 ? n : null;
}

