import { getWarsawDayBoundaries, getWarsawDateString } from "../_shared/time.ts";
import { fetchMedicalContext } from "../_shared/medicalContext.ts";
import { fetchHealthCoachContext } from '../_shared/healthCoachContext.ts';
import { shiftDateStr, calibrateNutrition, type CoachRow, type HealthCoachSource } from '@vanguard/domain';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {HttpError} from '../_shared/http.ts';

const KCAL_PER_KG = 7700;

const num = (v: unknown): number | null => (v == null || isNaN(Number(v)) ? null : Number(v));
const mean = (xs: number[]): number | null => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const clean = (rows: CoachRow[], key: string) => rows.map(r => num(r[key])).filter((v): v is number => v != null && v >= 0);

export async function fetchNutritionData(supabase: SupabaseClient, userId: string, today: string) {
  const targetDate = new Date(today + "T12:00:00Z");
  const asOf = new Date(Math.min(Date.now(), new Date(getWarsawDayBoundaries(today).end).getTime())).toISOString();
  const [context, medicalContext] = await Promise.all([
    fetchHealthCoachContext({ supabase, userId, asOf }), fetchMedicalContext(supabase, userId, today),
  ]);
  const rows = (source: HealthCoachSource): Array<CoachRow & { date: string }> =>
    (context.sources[source].value ?? []).map(row => ({ ...row, date: String(row.date ?? '') }));
  const profile = context.sources.nutrition_profile.value?.[0];
  if (!profile) throw new HttpError(400,'Najpierw uzupełnij profil żywienia i aktualny pomiar masy.');
  const d30 = context.windowStart;
  const bm = rows('body_metrics').filter(row => row.date >= shiftDateStr(today, -44)).reverse();
  const oura = rows('oura_daily_summary'), nutr = rows('daily_nutrition');
  const runs = rows('strava_activities_clean').filter(row => /run/i.test(String(row.sport_type)) && String(row.start_date) >= getWarsawDayBoundaries(d30).start);
  return { profile, bm, oura, nutr,
    dayReviews: rows('nutrition_day_reviews').filter(row => row.completeness === 'complete'), runs,
    gym: rows('workout_sessions').filter(row => row.date >= d30),
    todayOura: oura.find(row => row.date === today), todayNutr: nutr.find(row => row.date === today),
    medicalContext, today, targetDate, d30, context };
}

export function computeNutritionSignals(data: Omit<Awaited<ReturnType<typeof fetchNutritionData>>, 'context'> & Partial<Pick<Awaited<ReturnType<typeof fetchNutritionData>>, 'context'>>, evidenceDate=data.today) {
  const { profile, bm, oura, nutr, dayReviews, runs, gym, todayOura, todayNutr, medicalContext, today, targetDate, context } = data;
  const roundMean = (rows: CoachRow[], key: string) => { const value = mean(clean(rows,key)); return value == null ? null : Math.round(value); };
  const weights = bm.filter(row => (num(row.weight) ?? 0) > 0).sort((a,b)=>a.date.localeCompare(b.date));
  const first = weights[0], last = weights.at(-1);
  const weightFresh = last != null && last.date >= shiftDateStr(evidenceDate,-30);
  const latestWeight = weightFresh ? num(last.weight) : null;
  const weightDaysSpan = first && last ? (Date.parse(last.date)-Date.parse(first.date))/86400000 : 0;
  const reliableWeightWindow = weightDaysSpan >= 13 && last != null && last.date >= shiftDateStr(evidenceDate,-7);
  const weightTrendPerWeek = reliableWeightWindow ? +((Number(last.weight)-Number(first.weight))*7/weightDaysSpan).toFixed(2) : null;
  const calibration = calibrateNutrition(nutr.map(row=>({date:row.date,calories:num(row.calories)})),
    weights.map(row=>({date:row.date,weight_kg:num(row.weight)})),dayReviews.map(row=>({date:row.date,completeness:String(row.completeness)})),evidenceDate);
  const completeDates = new Set(dayReviews.map(row=>row.date));
  const completeNutr = nutr.filter(row=>completeDates.has(row.date));
  const avgIntake = calibration.averageCalories, daysLogged = calibration.loggedDays;
  const avgProtein = roundMean(completeNutr,'protein'), avgCarbs = roundMean(completeNutr,'carbs'), avgFat = roundMean(completeNutr,'fat');
  const avgFiber = mean(clean(completeNutr,'fiber'));
  const energyRecent = oura.some(row=>row.date >= shiftDateStr(evidenceDate,-7) && (num(row.total_calories) ?? 0) > 0);
  const avgTdeeOura = energyRecent ? roundMean(oura.filter(row=>(num(row.total_calories) ?? 0)>0),'total_calories') : null;
  const avgActive = roundMean(oura,'active_calories');
  const maintFromLog = calibration.maintenanceEstimateKcal;
  const estMaintenance = maintFromLog != null && maintFromLog > 0 ? maintFromLog : avgTdeeOura;
  const maintenanceBasis = maintFromLog != null ? 'estimated_energy_balance' : avgTdeeOura != null ? 'estimated_wearable' : 'missing';
  const todayPlans = context?.sources.training_plan_workouts.value?.filter(row=>row.planned_date === today && !row.skipped_at) ?? [];
  const todayPlan = todayPlans[0];
  const recentLongEffort = runs.some(row=>(num(row.distance) ?? 0)>=30000 && String(row.start_date)>=shiftDateStr(today,-3));
  const strain = context?.sources.daily_strain.value?.find(row=>row.date === today);
  const recoveryHold = recentLongEffort || strain?.illness_level === 'high' || strain?.illness_level === 'moderate'
    || (num(todayOura?.total_sleep_hours) != null && Number(todayOura?.total_sleep_hours)<6)
    || (num(todayOura?.readiness_score) != null && Number(todayOura?.readiness_score)<60);
  const keyTrainingDay = todayPlans.some(row=>{
    const prescription=row.prescription && typeof row.prescription === 'object'?row.prescription as CoachRow:null;
    return prescription?.intensity === 'hard' || (num(prescription?.durationMinutes) ?? 0)>=90;
  });
  const daysToEvent = typeof profile.event_date === 'string' ? Math.round((Date.parse(profile.event_date)-Date.parse(today))/86400000) : null;
  // Event proximity is context, not proof of a marathon taper or training phase.
  const inTaper = false;
  const declaredLoss = num(profile.weekly_loss_kg);
  const targetWeeklyLossKg = declaredLoss != null && declaredLoss >= 0 && declaredLoss <= 1 ? declaredLoss : null;
  const deficitPerDay = recoveryHold || keyTrainingDay ? 0 : targetWeeklyLossKg == null ? null : Math.round(targetWeeklyLossKg*KCAL_PER_KG/7);
  // No automatic calorie correction from incomplete logs or partial-day watch calories.
  const adaptiveCorrectionKcal = 0, addBack = 0, underlogGap = null;
  const targetKcal = estMaintenance != null && (deficitPerDay ?? 0)<estMaintenance ? estMaintenance-(deficitPerDay ?? 0) : null;
  const proteinFloor = latestWeight == null ? null : Math.round(latestWeight*(num(profile.protein_g_per_kg) ?? 2));
  const forecastAt = (days: number) => ({weight: calibration.status === 'ready' && weights.length>=4 && latestWeight != null && weightTrendPerWeek != null
    ? +(latestWeight+weightTrendPerWeek*days/7).toFixed(1) : null,bf:null});
  const forecast30 = forecastAt(30), forecast60 = forecastAt(60), forecast90 = forecastAt(90), daysToGoalEst = null;
  const intakeSoFar = num(todayNutr?.calories), proteinSoFar = num(todayNutr?.protein);
  const age = typeof profile.birth_date === 'string' ? Math.floor((targetDate.getTime()-Date.parse(profile.birth_date))/(365.25*86400000)) : null;
  const signals = {
    as_of:context?.asOf ?? targetDate.toISOString(),window:context?.windowStart ?? data.d30,calibration,
    profile:{height_cm:num(profile.height_cm),age,sex:profile.sex,goal_body_fat:num(profile.goal_body_fat),current_body_fat_est:num(profile.current_body_fat_est),event_name:profile.event_name,event_date:profile.event_date,days_to_event:daysToEvent,in_taper:inTaper,weekly_loss_kg:targetWeeklyLossKg},
    body:{weight:latestWeight,weight_date:last?.date ?? null,weight_state:latestWeight == null?'missing_or_stale':'measured',waist:weightFresh?num(last?.waist):null,belly:weightFresh?num(last?.belly):null,weight_trend_kg_per_week:weightTrendPerWeek,weight_window_days:Math.round(weightDaysSpan)},
    forecast:{kind:'estimated_scenario',assumptions:'Liniowy trend masy wymaga aktualnych pomiarów i pełnych dni; nie przewiduje rozkładu tłuszczu i masy beztłuszczowej.',target_weekly_loss_kg:targetWeeklyLossKg,observed_weekly_loss_kg:weightTrendPerWeek == null?null:-weightTrendPerWeek,adaptive_correction_kcal:adaptiveCorrectionKcal,forecast_30d:forecast30,forecast_60d:forecast60,forecast_90d:forecast90,days_to_goal_est:daysToGoalEst},
    energy:{avg_tdee_oura:avgTdeeOura,oura_adjusted:avgTdeeOura,avg_active:avgActive,avg_intake_logged:avgIntake,maintenance_from_log:maintFromLog,est_maintenance:estMaintenance,maintenance_basis:maintenanceBasis,underlog_gap_kcal:underlogGap,days_logged_30:daysLogged,wearable_days:clean(oura,'total_calories').length},
    macros:{avg_protein:avgProtein,protein_per_kg:avgProtein == null || latestWeight == null?null:+(avgProtein/latestWeight).toFixed(2),avg_carbs:avgCarbs,avg_fat:avgFat,avg_fiber:avgFiber,intake_cv:null},
    activity:{avg_steps:roundMean(oura,'steps'),run_km_30d:+(runs.reduce((sum,row)=>sum+(num(row.distance) ?? 0),0)/1000).toFixed(1),runs_30d:runs.length,gym_30d:gym.length,planned_today:todayPlan ?? null,recovery_hold:recoveryHold,key_training_day:keyTrainingDay},
    recovery:{avg_sleep_h:mean(clean(oura,'total_sleep_hours')),avg_readiness:roundMean(oura,'readiness_score'),avg_hrv:roundMean(oura,'hrv_avg'),avg_rhr:roundMean(oura,'rhr_avg')},
    medical_context:medicalContext,
    today:{date:today,target_kcal:targetKcal,protein_floor_g:proteinFloor,deficit_kcal:deficitPerDay,add_back_kcal:addBack,intake_so_far:intakeSoFar,protein_so_far:proteinSoFar,remaining_kcal:targetKcal == null?null:targetKcal-(intakeSoFar ?? 0),remaining_protein:proteinFloor == null?null:Math.max(0,proteinFloor-(proteinSoFar ?? 0)),active_so_far:num(todayOura?.active_calories),steps_so_far:num(todayOura?.steps),food_complete:completeDates.has(today)},
  };
  return {signals,forecast30,forecast60,forecast90,daysToGoalEst,estMaintenance,targetKcal,proteinFloor,deficitPerDay,adaptiveCorrectionKcal,weightTrendPerWeek,underlogGap,avgTdeeOura,avgIntake};
}
