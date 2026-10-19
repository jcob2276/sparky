import { combineDateTimeWarsawISO, shiftDateStr } from '../date';
import { supabase } from '../supabase';
import { buildDayNightTimeline, type DayNightRaw } from './ouraDayTimeline';
import type { DayNightTimeline } from './ouraDayTimeline.types';

interface DayNightSourceError { source: string; message: string }

export interface DayNightTimelineResult {
  timeline: DayNightTimeline;
  /** Layers that failed to load; the timeline still contains everything that did. */
  sourceErrors: DayNightSourceError[];
}

export async function fetchDayNightTimeline(userId: string, nightDate: string): Promise<DayNightTimelineResult> {
  // Window starts 06:00 the previous day; the end is wake time (<= 10:00 usually), so query to the end of the morning.
  const fromISO = combineDateTimeWarsawISO(shiftDateStr(nightDate, -1), '06:00');
  const toISO = combineDateTimeWarsawISO(shiftDateStr(nightDate, 1), '00:00');

  const [enhanced, phases, heartRate, hrv, food, supplements, strava, sessions] = await Promise.all([
    supabase.from('oura_enhanced').select('bedtime_start,bedtime_end').eq('user_id', userId)
      .eq('date', nightDate).limit(1),
    supabase.from('oura_sleep_phase_timeline').select('ts,phase,phase_code').eq('user_id', userId)
      .eq('day', nightDate).order('ts'),
    supabase.from('oura_sleep_hr_timeline').select('ts,bpm').eq('user_id', userId)
      .eq('day', nightDate).order('ts'),
    supabase.from('oura_sleep_hrv_timeline').select('ts,hrv').eq('user_id', userId)
      .eq('day', nightDate).order('ts'),
    supabase.from('daily_food_entries').select('id,name,calories,logged_at,meal_group_id').eq('user_id', userId)
      .gte('logged_at', fromISO).lte('logged_at', toISO).order('logged_at'),
    supabase.from('supplement_logs').select('id,logged_at,quantity,supplements(name)').eq('user_id', userId)
      .gte('logged_at', fromISO).lte('logged_at', toISO).order('logged_at'),
    supabase.from('strava_activities_clean')
      .select('strava_id,name,sport_type,start_date,moving_time,elapsed_time').eq('user_id', userId)
      .gte('start_date', fromISO).lte('start_date', toISO),
    supabase.from('workout_sessions').select('id,start_time,end_time,duration_minutes').eq('user_id', userId)
      .gte('start_time', fromISO).lte('start_time', toISO),
  ]);

  const sourceErrors: DayNightSourceError[] = Object.entries({
    oura_enhanced: enhanced.error,
    oura_sleep_phase_timeline: phases.error,
    oura_sleep_hr_timeline: heartRate.error,
    oura_sleep_hrv_timeline: hrv.error,
    daily_food_entries: food.error,
    supplement_logs: supplements.error,
    strava_activities_clean: strava.error,
    workout_sessions: sessions.error,
  }).flatMap(([source, error]) => (error ? [{ source, message: error.message }] : []));

  const bedtime = enhanced.data?.[0];
  const raw: DayNightRaw = {
    nightDate,
    bedtimeStart: bedtime?.bedtime_start ?? null,
    bedtimeEnd: bedtime?.bedtime_end ?? null,
    phases: phases.data ?? [],
    heartRate: heartRate.data ?? [],
    hrv: hrv.data ?? [],
    foodEntries: food.data ?? [],
    supplementLogs: (supplements.data ?? []).map((row) => ({
      id: row.id,
      logged_at: row.logged_at,
      quantity: row.quantity,
      name: row.supplements?.name ?? null,
    })),
    stravaActivities: strava.data ?? [],
    workoutSessions: sessions.data ?? [],
  };

  return { timeline: buildDayNightTimeline(raw), sourceErrors };
}
