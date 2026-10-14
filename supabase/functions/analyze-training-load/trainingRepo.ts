import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchHealthCoachContext } from '../_shared/healthCoachContext.ts';
import { type HealthCoachSource, getWarsawDayBoundaries } from '@vanguard/domain';

export async function fetchTrainingRawData(
  supabase: SupabaseClient,
  userId: string,
  w4Start: string,
  w0Start: string,
  today: string,
  addWarsawDays: (d: string, days: number) => string,
) {
  const end = new Date(getWarsawDayBoundaries(today).end).getTime();
  const context = await fetchHealthCoachContext({ supabase, userId,
    asOf: new Date(Math.min(Date.now(), end)).toISOString() });
  const rows = (source: HealthCoachSource) => context.sources[source].value ?? [];
  const recentRows = (source: HealthCoachSource) => rows(source)
    .filter(row => String(row.date) >= w4Start && String(row.date) <= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  // Validate the flexible evidence boundary before passing sets to the typed coach.
  const workouts = recentRows('workout_sessions').flatMap(row => {
    if (typeof row.date !== 'string') return [];
    const logs: unknown[] = Array.isArray(row.exercise_logs) ? row.exercise_logs : [];
    const exercise_logs = logs.flatMap(log => {
      if (!log || typeof log !== 'object' || !('exercise_name' in log) || typeof log.exercise_name !== 'string') return [];
      const value = (key: string) => key in log ? Reflect.get(log, key) : null;
      const effort = (key: string): number | null => {
        const raw = value(key);
        return (typeof raw === 'number' || typeof raw === 'string') && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : null;
      };
      return [{ ...log, exercise_name: log.exercise_name, rir: effort('rir'), rpe: effort('rpe'),
        muscle_tags: Array.isArray(value('muscle_tags')) ? value('muscle_tags').filter((tag: unknown): tag is string => typeof tag === 'string') : [] }];
    });
    return [{ ...row, date: row.date, exercise_logs }];
  });
  return {
    strainAll: recentRows('daily_strain'),
    workoutsAll: workouts,
    stravaAll: rows('strava_activities_clean').filter(row =>
      String(row.start_date) >= getWarsawDayBoundaries(w4Start).start)
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date))),
    ouraAll: recentRows('oura_daily_summary'),
    planContext: rows('training_plan_workouts').filter(row =>
      String(row.planned_date) >= w0Start && String(row.planned_date) <= addWarsawDays(today, 7)),
    queryErrors: context.queryErrors,
    context,
  };
}
