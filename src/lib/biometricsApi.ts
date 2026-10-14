import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { getTodayWarsaw, shiftDateStr } from './date';
import { biometricsKeys } from './queryKeys';
import { buildWeeklyBodyPulse, weeklyBodyPulseWindow } from './weeklyBodyPulse';
import { selectCanonicalOuraDay } from './biometrics/ouraDayModel';
import { mapOuraNightDetails } from './biometrics/ouraNightDetails';
import { buildOuraContextInsights } from './biometrics/ouraContextInsights';

// ── QUERIES ──

export function useDailyStrainOura(userId: string) {
  return useQuery({
    queryKey: biometricsKeys.dailyStrainOura(userId),
    queryFn: async () => {
      const todayStr = getTodayWarsaw();
      const recentStart = shiftDateStr(todayStr, -7);

      const [
        { data: strainRows, error: e1 },
        { data: ouraRows, error: e2 },
        { data: enhancedRows, error: e3 },
        { data: profileRow },
        { data: stravaRows },
      ] = await Promise.all([
        supabase
          .from('daily_strain')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('oura_daily_summary')
          .select('*')
          .eq('user_id', userId)
          .gte('date', recentStart)
          .lte('date', todayStr)
          .order('date', { ascending: false }),
        supabase
          .from('oura_enhanced')
          .select('*')
          .eq('user_id', userId)
          .gte('date', recentStart)
          .lte('date', todayStr)
          .order('date', { ascending: false }),
        supabase
          .from('nutrition_profile')
          .select('birth_date')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('strava_activities_clean')
          .select('gc_vo2max,source,icu_activity_id,icu_hr_zone_times,gc_hr_zones,name,sport_type,start_date,distance,moving_time,hr_avg,hr_max')
          .eq('user_id', userId)
          .eq('is_oura',false)
          .gte('start_date',recentStart)
          .lte('start_date',new Date().toISOString())
          .order('start_date', { ascending: false })
          .limit(20),
      ]);

      if (e1) console.warn('[useDailyStrainOura] e1 warning:', e1.message);
      if (e2) console.warn('[useDailyStrainOura] e2 warning:', e2.message);
      if (e3) console.warn('[useDailyStrainOura] e3 warning:', e3.message);

      const canonicalDay = selectCanonicalOuraDay({
        preferredDate: todayStr,
        summaries: ouraRows || [],
        enhanced: enhancedRows || [],
      });
      const ouraRow = canonicalDay?.summary ?? null;
      const enhancedRow = canonicalDay?.enhanced ?? null;
      const ouraYesterdayRow = canonicalDay?.previous?.summary ?? null;
      const enhancedYesterdayRow = canonicalDay?.previous?.enhanced ?? null;

      let garminVo2Max: number | null = null;
      let externalVo2Source: string | null = null;

      if (stravaRows && Array.isArray(stravaRows) && stravaRows.length > 0) {
        for (const act of stravaRows) {
          if (act.gc_vo2max != null && Number(act.gc_vo2max) > 0) {
            garminVo2Max = Number(act.gc_vo2max);
            externalVo2Source = 'Garmin Connect';
            break;
          }
        }

      }

      return {
        row: strainRows,
        day: canonicalDay,
        date: canonicalDay?.date ?? null,
        missingSources: canonicalDay?.missingSources ?? ['oura_daily_summary', 'oura_enhanced'],
        oura: ouraRow,
        ouraYesterday: ouraYesterdayRow,
        enhanced: enhancedRow,
        enhancedYesterday: enhancedYesterdayRow,
        birthDateStr: profileRow?.birth_date ?? null,
        garminVo2Max,
        externalVo2Source,
        stravaRows: stravaRows || [],
      };
    },
    staleTime: 0,
    refetchOnMount: 'always',
    enabled: !!userId,
  });
}

export function useWeeklyBodyPulse(userId: string) {
  const { since } = weeklyBodyPulseWindow();
  return useQuery({
    queryKey: biometricsKeys.weeklyPulse(userId, since),
    queryFn: async () => {
      const [{ data: strain }, { data: sessions }, { data: strava }, { data: oura }] = await Promise.all([
        supabase.from('daily_strain').select('*').eq('user_id', userId).gte('date', since),
        supabase.from('workout_sessions').select('*').eq('user_id', userId).gte('workout_day', since),
        supabase.from('strava_activities').select('*').eq('user_id', userId).gte('start_date', since),
        supabase.from('oura_daily_summary').select('*').eq('user_id', userId).gte('date', since),
      ]);

      return buildWeeklyBodyPulse({
        since,
        sessions: sessions || [],
        strava: strava || [],
        oura: oura || [],
        strain: strain || [],
      });
    },
    staleTime: 1000 * 60 * 30,
    enabled: !!userId,
  });
}

export function useOuraHistory30Days(userId: string) {
  return useQuery({
    queryKey: biometricsKeys.ouraHistory30(userId),
    queryFn: async () => {
      const todayStr = getTodayWarsaw();
      const startDate = shiftDateStr(todayStr, -365); // Full Oura history (7+ months)

      const [{ data: ouraHistory, error: e1 }, { data: enhancedHistory, error: e2 }] = await Promise.all([
        supabase
          .from('oura_daily_summary')
          .select('*')
          .eq('user_id', userId)
          .gte('date', startDate)
          .order('date', { ascending: true }),
        supabase
          .from('oura_enhanced')
          .select('*')
          .eq('user_id', userId)
          .gte('date', startDate)
          .order('date', { ascending: true }),
      ]);

      if (e1) console.warn('[useOuraHistory30Days] e1 warning:', e1.message);
      if (e2) console.warn('[useOuraHistory30Days] e2 warning:', e2.message);

      return {
        ouraHistory: ouraHistory || [],
        enhancedHistory: enhancedHistory || [],
      };
    },
    staleTime: 1000 * 60 * 30,
    enabled: !!userId,
  });
}

export function useOuraNightDetails(
  userId: string,
  date: string | null,
  bedtimeStart?: string | null,
  bedtimeEnd?: string | null,
) {
  return useQuery({
    queryKey: biometricsKeys.ouraNight(userId, date ?? ''),
    queryFn: async () => {
      if (!date) return null;
      const [phasesResult, heartRateResult, hrvResult] = await Promise.all([
        supabase
          .from('oura_sleep_phase_timeline')
          .select('ts,phase,phase_code')
          .eq('user_id', userId)
          .eq('day', date)
          .order('ts'),
        supabase
          .from('oura_sleep_hr_timeline')
          .select('ts,bpm')
          .eq('user_id', userId)
          .eq('day', date)
          .order('ts'),
        supabase
          .from('oura_sleep_hrv_timeline')
          .select('ts,hrv')
          .eq('user_id', userId)
          .eq('day', date)
          .order('ts'),
      ]);

      if (phasesResult.error) console.warn('[useOuraNightDetails] phases:', phasesResult.error.message);
      if (heartRateResult.error) console.warn('[useOuraNightDetails] heart rate:', heartRateResult.error.message);
      if (hrvResult.error) console.warn('[useOuraNightDetails] HRV:', hrvResult.error.message);

      return mapOuraNightDetails({
        date,
        bedtimeStart,
        bedtimeEnd,
        phases: phasesResult.data ?? [],
        heartRate: heartRateResult.data ?? [],
        hrv: hrvResult.data ?? [],
      });
    },
    enabled: !!userId && !!date,
    staleTime: 1000 * 60 * 30,
  });
}

export function useOuraContext(userId: string, contextDate: string | null, bedtimeStart: string | null) {
  return useQuery({
    queryKey: biometricsKeys.ouraContext(userId, contextDate ?? ''),
    queryFn: async () => {
      if (!contextDate) return null;
      const [phoneResult, workoutResult, foodResult] = await Promise.all([
        supabase
          .from('phone_usage_daily')
          .select('*')
          .eq('user_id', userId)
          .eq('date', contextDate)
          .maybeSingle(),
        supabase
          .from('workout_sessions')
          .select('duration_minutes,hr_strain_score,end_time')
          .eq('user_id', userId)
          .eq('workout_day', contextDate)
          .order('end_time'),
        supabase
          .from('daily_food_entries')
          .select('name,calories,food_quality_score,logged_at')
          .eq('user_id', userId)
          .eq('date', contextDate)
          .order('logged_at'),
      ]);

      if (phoneResult.error) console.warn('[useOuraContext] phone usage:', phoneResult.error.message);
      if (workoutResult.error) console.warn('[useOuraContext] workouts:', workoutResult.error.message);
      if (foodResult.error) console.warn('[useOuraContext] food:', foodResult.error.message);

      return buildOuraContextInsights({
        sleepDate: contextDate,
        bedtimeStart,
        phoneUsage: phoneResult.data,
        workouts: workoutResult.data ?? [],
        foodEntries: foodResult.data ?? [],
      });
    },
    enabled: !!userId && !!contextDate,
    staleTime: 1000 * 60 * 15,
  });
}
