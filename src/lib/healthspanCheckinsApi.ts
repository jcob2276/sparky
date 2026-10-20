import { format, startOfWeek } from 'date-fns';
import type { FunctionalAgeProfile, HealthspanContributorKey } from '@vanguard/domain';
import { getTodayWarsaw } from './date';
import { supabase } from './supabase';

export interface HealthspanCheckinPayload {
  sleepQuality?: number;
  sleepHours?: number;
  sleepConsistency?: number;
  energy?: number;
  mood?: number;
  stress?: number;
  steps?: number;
  restingHeartRate?: number;
  weight?: number;
  bodyFat?: number;
  vo2Max?: number;
  exerciseSessions?: number;
  strengthSessions?: number;
  breathlessEfforts?: number;
  dietQuality?: number;
  alcoholUnits?: number;
  socialConnection?: number;
  recovery?: number;
  movementMinutes?: number;
  activityIntensity?: number;
  activityType?: string;
}


export interface HealthspanLeverRow {
  id: string;
  contributor_key: string;
  title: string;
  target_label: string;
  baseline_score: number | null;
  target_score: number | null;
  actual_score: number | null;
  status: 'proposed' | 'accepted' | 'completed' | 'dismissed' | 'evaluated';
  outcome: 'success' | 'fail' | 'no_data' | null;
  week_start: string;
}

export const currentHealthspanWeek = (today = getTodayWarsaw()) => (
  format(startOfWeek(new Date(`${today}T12:00:00`), { weekStartsOn: 1 }), 'yyyy-MM-dd')
);

export const evaluateHealthspanLeverOutcome = (
  actual: number | null,
  baseline: number | null,
  target: number | null,
): 'success' | 'fail' | 'no_data' => {
  if (actual == null) return 'no_data';
  return actual >= (target ?? (baseline ?? actual) + 5) ? 'success' : 'fail';
};

export async function fetchHealthspanCheckins(userId: string, since: string) {
  const { data, error } = await supabase.from('healthspan_checkins')
    .select('checkin_date, period, payload, updated_at')
    .eq('user_id', userId)
    .gte('checkin_date', since)
    .order('checkin_date');
  if (error) throw error;
  return data ?? [];
}

const leverCopy: Record<HealthspanContributorKey, { title: string; target: string }> = {
  cardio_fitness: { title: 'Wydolność', target: '1 jakościowa sesja aerobowa' },
  resting_heart_rate: { title: 'Regeneracja serca', target: '3 spokojne bloki regeneracyjne' },
  sleep_duration: { title: 'Długość snu', target: '7,5 h snu przez co najmniej 5 nocy' },
  sleep_regularity: { title: 'Regularność snu', target: 'Pora snu w oknie ±30 minut' },
  daily_movement: { title: 'Codzienny ruch', target: 'Domknij cel kroków przez 5 dni' },
  aerobic_activity: { title: 'Ruch aerobowy', target: '150 minut ruchu w tygodniu' },
  strength: { title: 'Siła', target: '2 sesje oporowe w tygodniu' },
  body_composition: { title: 'Kompozycja ciała', target: 'Utrzymaj plan żywienia przez 5 dni' },
  stress_recovery: { title: 'Stres i recovery', target: '10 minut wyciszenia przez 5 dni' },
  lifestyle: { title: 'Styl życia', target: 'Wykonaj najważniejszy check-in tygodnia' },
  social_connection: { title: 'Relacje', target: 'Zaplanuj 2 jakościowe kontakty w tym tygodniu' },
};

export async function syncHealthspanLevers(userId: string, profile: FunctionalAgeProfile) {
  await evaluatePreviousHealthspanLevers(userId, profile);
  const weekStart = currentHealthspanWeek(profile.asOfDate);
  const opportunities = [
    ...profile.contributors.filter((item) => item.direction === 'opportunity'),
    ...profile.contributors.filter((item) => item.direction === 'neutral'),
  ].slice(0, 3);
  if (opportunities.length) {
    const { error } = await supabase.from('healthspan_levers').upsert(
      opportunities.map((item) => ({
        user_id: userId,
        week_start: weekStart,
        contributor_key: item.key,
        title: leverCopy[item.key].title,
        target_label: leverCopy[item.key].target,
        baseline_score: item.score,
        target_score: Math.min(100, item.score + 5),
      })),
      { onConflict: 'user_id,week_start,contributor_key', ignoreDuplicates: true },
    );
    if (error) throw error;
  }
  return fetchHealthspanLevers(userId);
}

async function evaluatePreviousHealthspanLevers(userId: string, profile: FunctionalAgeProfile) {
  const currentWeek = currentHealthspanWeek(profile.asOfDate);
  const { data, error } = await supabase.from('healthspan_levers')
    .select('id, contributor_key, baseline_score, target_score')
    .eq('user_id', userId)
    .lt('week_start', currentWeek)
    .in('status', ['accepted', 'completed']);
  if (error) throw error;
  for (const lever of data ?? []) {
    const contributor = profile.contributors.find((item) => item.key === lever.contributor_key);
    const actual = contributor?.score ?? null;
    const outcome = evaluateHealthspanLeverOutcome(
      actual,
      lever.baseline_score,
      lever.target_score,
    );
    const { error: updateError } = await supabase.from('healthspan_levers').update({
      status: 'evaluated',
      outcome,
      actual_score: actual,
      evaluated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', lever.id).eq('user_id', userId);
    if (updateError) throw updateError;
  }
}

async function fetchHealthspanLevers(userId: string) {
  const { data, error } = await supabase.from('healthspan_levers')
    .select('id, contributor_key, title, target_label, baseline_score, target_score, actual_score, status, outcome, week_start')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as HealthspanLeverRow[];
}
