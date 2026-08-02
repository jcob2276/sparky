import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek } from 'date-fns';
import type { FunctionalAgeProfile, HealthspanContributorKey } from '@vanguard/domain';
import type { Json } from './database.types';
import { getTodayWarsaw } from './date';
import { healthspanKeys } from './queryKeys';
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

export type HealthspanCheckinPeriod = 'daily' | 'weekly' | 'manual';

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

async function saveHealthspanCheckin(input: {
  userId: string;
  period: HealthspanCheckinPeriod;
  date?: string;
  payload: HealthspanCheckinPayload;
}) {
  const { error } = await supabase.from('healthspan_checkins').upsert({
    user_id: input.userId,
    checkin_date: input.date ?? getTodayWarsaw(),
    period: input.period,
    payload: input.payload as Json,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,checkin_date,period' });
  if (error) throw error;
}

async function saveHealthspanOnboarding(
  userId: string,
  input: { birthDate: string; sex: 'M' | 'F'; payload: HealthspanCheckinPayload },
) {
  const [profileResult] = await Promise.all([
    supabase.from('nutrition_profile').upsert({
      user_id: userId,
      birth_date: input.birthDate,
      sex: input.sex,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }),
    saveHealthspanCheckin({ userId, period: 'manual', payload: input.payload }),
  ]);
  if (profileResult.error) throw profileResult.error;
}

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

export async function fetchHealthspanLevers(userId: string) {
  const { data, error } = await supabase.from('healthspan_levers')
    .select('id, contributor_key, title, target_label, baseline_score, target_score, actual_score, status, outcome, week_start')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as HealthspanLeverRow[];
}

export async function decideHealthspanLever(
  userId: string,
  id: string,
  status: 'accepted' | 'completed' | 'dismissed',
) {
  const { error } = await supabase.from('healthspan_levers').update({
    status,
    decided_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export function useSaveHealthspanCheckin(userId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { period: HealthspanCheckinPeriod; payload: HealthspanCheckinPayload }) => (
      saveHealthspanCheckin({ userId: userId!, ...input })
    ),
    onSuccess: () => client.invalidateQueries({ queryKey: healthspanKeys.all }),
  });
}

export function useSaveHealthspanOnboarding(userId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { birthDate: string; sex: 'M' | 'F'; payload: HealthspanCheckinPayload }) => (
      saveHealthspanOnboarding(userId!, input)
    ),
    onSuccess: () => client.invalidateQueries({ queryKey: healthspanKeys.all }),
  });
}

function useHealthspanLevers(userId: string | undefined) {
  return useQuery({
    queryKey: [...healthspanKeys.all, 'levers', userId],
    queryFn: () => fetchHealthspanLevers(userId!),
    enabled: Boolean(userId),
  });
}

export function useDecideHealthspanLever(userId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: 'accepted' | 'completed' | 'dismissed' }) => (
      decideHealthspanLever(userId!, input.id, input.status)
    ),
    onSuccess: () => client.invalidateQueries({ queryKey: healthspanKeys.all }),
  });
}
