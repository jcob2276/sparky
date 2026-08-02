import { useQuery } from '@tanstack/react-query';
import {
  computeFunctionalAge,
  computeHealthspanTrend,
  type FunctionalAgeProfile,
  type HealthspanPace,
  type HealthspanContributor,
  type HealthspanConfounder,
} from '@vanguard/domain';
import { supabase } from './supabase';
import { getTodayWarsaw, shiftDateStr } from './date';
import { healthspanKeys } from './queryKeys';
import type { Json } from './database.types';
import {
  fetchHealthspanCheckins,
  syncHealthspanLevers,
} from './healthspanCheckinsApi';
import { projectManualHealthspanEvidence } from './healthspanManualProjection';
import {
  mergeOuraHealthspanRows,
  deriveHealthspanToday,
  projectHealthspanEvidence,
  type HealthspanActivityRow,
  type HealthspanBodyRow,
  type HealthspanOuraRow,
  type HealthspanStrengthRow,
} from './healthspanProjection';
import { fetchHealthspanHistory } from './healthspanHistoryApi';

const ageFromBirthDate = (birthDate: string | null, today: string) => {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T12:00:00Z`);
  const now = new Date(`${today}T12:00:00Z`);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  if (
    now.getUTCMonth() < birth.getUTCMonth()
    || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
  ) age--;
  return age;
};

async function persistHealthspanSnapshot(userId: string, today: string, profile: FunctionalAgeProfile, pace: HealthspanPace) {
  const { error: snapshotError } = await supabase.from('healthspan_snapshots').upsert({
    user_id: userId,
    snapshot_date: today,
    model_version: profile.modelVersion,
    profile: JSON.parse(JSON.stringify(profile)) as Json,
    pace: JSON.parse(JSON.stringify(pace)) as Json,
    input_summary: JSON.parse(JSON.stringify({
      sources: [...new Set(profile.contributors.map((item: HealthspanContributor) => item.source))],
      contributor_count: profile.contributors.length,
      confidence: profile.confidence,
      methodology_version: profile.modelVersion,
      evidence: profile.contributors.map((item: HealthspanContributor) => ({
        key: item.key,
        source: item.source,
        measured_at: item.measuredAt,
        sample_count: item.sampleCount,
        quality: item.quality,
      })),
    })) as Json,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,snapshot_date,model_version' });
  if (snapshotError) console.warn('[healthspan] snapshot write failed', snapshotError.message);
}

export async function fetchHealthspanProfile(userId: string, today = getTodayWarsaw()) {
  const since90 = shiftDateStr(today, -89);
  const since45 = shiftDateStr(today, -44);
  const [
    summaryRes,
    enhancedRes,
    activitiesRes,
    strengthRes,
    bodyRes,
    profileRes,
    behaviorRes,
    illnessRes,
    checkins,
  ] = await Promise.all([
    supabase.from('oura_daily_summary')
      .select('date, rhr_avg, total_sleep_hours, steps')
      .eq('user_id', userId).gte('date', since90).lte('date', today).order('date'),
    supabase.from('oura_enhanced')
      .select('date, vo2_max, bedtime_start, stress_high_minutes, recovery_high_minutes')
      .eq('user_id', userId).gte('date', since90).lte('date', today).order('date'),
    supabase.from('strava_activities')
      .select('strava_id, gc_activity_id, start_date, gc_vo2max, gc_hr_zones, gc_training_effect_aerobic, gc_training_effect_anaerobic, moving_time, sport_type, source')
      .eq('user_id', userId).gte('start_date', `${since45}T00:00:00`).order('start_date'),
    supabase.from('workout_sessions')
      .select('date, workout_day')
      .eq('user_id', userId)
      .not('workout_day', 'ilike', '%sauna%')
      .gte('date', since90).lte('date', today).order('date'),
    supabase.from('body_metrics')
      .select('date, body_fat')
      .eq('user_id', userId).gte('date', since90).lte('date', today).order('date'),
    supabase.from('nutrition_profile')
      .select('birth_date, sex, current_body_fat_est, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('behavior_log')
      .select('date, behavior_key, value, note').eq('user_id', userId).gte('date', since90).lte('date', today),
    supabase.from('daily_strain')
      .select('date, illness_level, recovery_score, daily_status, main_limiter')
      .eq('user_id', userId).gte('date', shiftDateStr(today, -13)).lte('date', today).order('date'),
    fetchHealthspanCheckins(userId, since90).catch(() => []),
  ]);

  const chronologicalAge = ageFromBirthDate(profileRes.data?.birth_date ?? null, today);
  if (chronologicalAge == null) return null;
  const sex = profileRes.data?.sex === 'F' ? 'F' as const : 'M' as const;
  const oura = mergeOuraHealthspanRows(
    (summaryRes.data ?? []) as HealthspanOuraRow[],
    (enhancedRes.data ?? []) as HealthspanOuraRow[],
  );
  const manual = projectManualHealthspanEvidence(checkins, behaviorRes.data ?? []);
  const common = {
    asOfDate: today,
    chronologicalAge,
    sex,
    activities: (activitiesRes.data ?? []) as HealthspanActivityRow[],
    strengthSessions: (strengthRes.data ?? [])
      .filter((row): row is typeof row & { date: string } => row.date != null)
      .map((row): HealthspanStrengthRow => ({ date: row.date })),
    body: [
      ...((bodyRes.data ?? []) as HealthspanBodyRow[]),
      ...(bodyRes.data?.some((row) => row.body_fat != null)
        || profileRes.data?.current_body_fat_est == null
        || profileRes.data.updated_at == null
        ? []
        : [{
          date: profileRes.data.updated_at.slice(0, 10),
          body_fat: profileRes.data.current_body_fat_est,
        }]),
    ],
    lifestyle: null,
  };
  const fullInput = projectHealthspanEvidence({ ...common, oura });
  fullInput.vo2Max ??= manual.vo2Max ?? null;
  fullInput.restingHeartRate ??= manual.restingHeartRate ?? null;
  fullInput.sleepDurationHours ??= manual.sleepDurationHours ?? null;
  fullInput.sleepRegularity ??= manual.sleepRegularity ?? null;
  fullInput.stepsDaily ??= manual.stepsDaily ?? null;
  fullInput.bodyComposition ??= manual.bodyComposition ?? null;
  fullInput.strengthDaysWeekly ??= manual.strengthDaysWeekly ?? null;
  fullInput.moderateVigorousMinutesWeekly ??= manual.moderateVigorousMinutesWeekly ?? null;
  fullInput.stressRecoveryBalance ??= manual.stressRecoveryBalance ?? null;
  fullInput.lifestyle ??= manual.lifestyle ?? null;
  fullInput.socialConnection = manual.socialConnection ?? null;
  const profile = computeFunctionalAge(fullInput);

  const keys = (behaviorRes.data ?? []).map((row) => (
    `${row.behavior_key} ${row.value ?? ''} ${row.note ?? ''}`.toLowerCase()
  ));
  const confounders: HealthspanConfounder[] = [];
  if ((illnessRes.data ?? []).some((row) => row.illness_level && row.illness_level !== 'none')) confounders.push('illness');
  if (keys.some((key) => /travel|podróż|podroz/.test(key))) confounders.push('travel');
  if (keys.some((key) => /alcohol|alkohol/.test(key))) confounders.push('alcohol');
  const history = await fetchHealthspanHistory(userId, today, '1y').catch(() => ({
    points: [],
    series: [],
    trendSnapshots: [],
  }));
  const pace = computeHealthspanTrend([
    ...history.trendSnapshots.filter((item) => item.date !== today),
    {
      date: today,
      modelVersion: profile.modelVersion,
      coverage: profile.confidence.coverage,
      evidenceStrength: profile.confidence.evidenceStrength,
      contributors: Object.fromEntries(profile.contributors.map((item) => [item.key, item.score])),
    },
  ], confounders);
  const latestStrain = illnessRes.data?.[illnessRes.data.length - 1];
  const contributorScore = (key: string) => profile.contributors.find((item) => item.key === key)?.score;
  const todayContext = deriveHealthspanToday({
    recoveryScore: latestStrain?.recovery_score,
    dailyStatus: latestStrain?.daily_status,
    mainLimiter: latestStrain?.main_limiter,
    sleepDurationScore: contributorScore('sleep_duration'),
    sleepRegularityScore: contributorScore('sleep_regularity'),
  });
  const levers = await syncHealthspanLevers(userId, profile).catch(() => []);
  await persistHealthspanSnapshot(userId, today, profile, pace);

  return {
    profile,
    pace,
    today: todayContext,
    levers,
    input: fullInput,
    history,
    summary: {
      positiveDrivers: profile.contributors.filter((item) => item.direction === 'positive').slice(0, 3),
      opportunities: profile.contributors.filter((item) => item.direction === 'opportunity').slice(0, 3),
      recentScore: profile.score,
      baselineScore: history.points[0]?.score ?? profile.score,
    },
  };
}

export function useHealthspanProfile(userId: string | undefined) {
  const today = getTodayWarsaw();
  return useQuery({
    queryKey: healthspanKeys.profile(userId ?? '', today),
    queryFn: () => fetchHealthspanProfile(userId!, today),
    enabled: Boolean(userId),
    staleTime: 15 * 60_000,
  });
}
