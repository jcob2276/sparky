import { useQuery } from '@tanstack/react-query';
import { estimateCaffeineMg } from '@vanguard/domain';
import { supabase } from '../supabase';

/** Jeden wpis z dziennika jedzenia, który zawiera kofeinę (kawa, herbata, energetyk...). */
export interface CaffeineEntry {
  date: string;
  name: string;
  /** ISO timestamptz; null gdy wpis nie ma godziny. */
  loggedAt: string | null;
  mg: number;
}

async function fetchCaffeineEntriesSince(userId: string, sinceDate: string): Promise<CaffeineEntry[]> {
  const { data, error } = await supabase
    .from('daily_food_entries')
    .select('date, name, logged_at')
    .eq('user_id', userId)
    .gte('date', sinceDate)
    .order('logged_at', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const mg = estimateCaffeineMg(row.name);
    return mg > 0 ? [{ date: row.date, name: row.name, loggedAt: row.logged_at, mg }] : [];
  });
}

export function useCaffeineEntries(userId: string, sinceDate: string) {
  return useQuery({
    queryKey: ['caffeine', 'entries', userId, sinceDate] as const,
    queryFn: () => fetchCaffeineEntriesSince(userId, sinceDate),
    enabled: !!userId && !!sinceDate,
  });
}
