import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { DEFAULT_LIFE_TARGETS, type LifeTargets } from './lifeGoals';

const positive = (value: unknown, fallback: number): number => {
  const n = value == null || value === '' ? NaN : Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Cele od właścicieli: tłuszcz z `nutrition_profile`, wyciskanie i dochód z `life_targets`. */
export async function fetchLifeTargets(userId: string): Promise<LifeTargets> {
  const [profile, targets] = await Promise.all([
    supabase.from('nutrition_profile').select('goal_body_fat').eq('user_id', userId).maybeSingle(),
    supabase.from('life_targets').select('bench_goal_kg, income_goal_net_pln').eq('user_id', userId).maybeSingle(),
  ]);
  return {
    bodyFatPct: positive(profile.data?.goal_body_fat, DEFAULT_LIFE_TARGETS.bodyFatPct),
    benchKg: positive(targets.data?.bench_goal_kg, DEFAULT_LIFE_TARGETS.benchKg),
    incomeNetPln: positive(targets.data?.income_goal_net_pln, DEFAULT_LIFE_TARGETS.incomeNetPln),
  };
}

/** Jedyna droga do celów w interfejsie; do czasu załadowania zwraca wartości awaryjne. */
export function useLifeTargets(userId: string | undefined): LifeTargets {
  const { data } = useQuery<LifeTargets>({
    queryKey: ['life-targets', userId],
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: () => fetchLifeTargets(userId as string),
  });
  return data ?? DEFAULT_LIFE_TARGETS;
}

/** Zapis celów z `life_targets`; cel tłuszczu ma własne pole w profilu żywieniowym. */
async function saveLifeTargets(userId: string, targets: Pick<LifeTargets, 'benchKg' | 'incomeNetPln'>): Promise<void> {
  const { error } = await supabase
    .from('life_targets')
    .upsert({ user_id: userId, bench_goal_kg: targets.benchKg, income_goal_net_pln: targets.incomeNetPln, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

export function useSaveLifeTargets(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targets: Pick<LifeTargets, 'benchKg' | 'incomeNetPln'>) => saveLifeTargets(userId, targets),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['life-targets', userId] });
      void queryClient.invalidateQueries({ queryKey: ['bench-goal', userId] });
      void queryClient.invalidateQueries({ queryKey: ['chronicle'] });
    },
  });
}
