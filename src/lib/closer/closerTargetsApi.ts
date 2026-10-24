import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { closerTargetsFromKpis, DEFAULT_CLOSER_TARGETS, type CloserWeeklyTargets } from './closerDayModel';

/** Cele tygodniowe z `goal_kpis` aktywnego projektu closera. */
async function fetchCloserTargets(userId: string): Promise<CloserWeeklyTargets> {
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', '%closer%')
    .eq('status', 'active')
    .maybeSingle();
  if (!project) return DEFAULT_CLOSER_TARGETS;
  const { data: kpis, error } = await supabase.from('goal_kpis').select('name, target').eq('user_id', userId).eq('project_id', project.id);
  if (error) throw error;
  return closerTargetsFromKpis(kpis ?? []);
}

/** Jedyna droga do celów tygodniowych sprzedaży w interfejsie; do czasu załadowania wartości awaryjne. */
export function useCloserTargets(userId: string | undefined): CloserWeeklyTargets {
  const { data } = useQuery<CloserWeeklyTargets>({
    queryKey: ['closer-targets', userId],
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: () => fetchCloserTargets(userId as string),
  });
  return data ?? DEFAULT_CLOSER_TARGETS;
}
