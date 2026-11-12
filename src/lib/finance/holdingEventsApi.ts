import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { financeKeys } from '../queryKeys';
import type { Database } from '../database.types';

export type HoldingEvent = Database['public']['Tables']['finance_holding_events']['Row'];
const PAGE_SIZE = 30;

export function useHoldingEvents(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: financeKeys.holdingEvents(userId ?? ''),
    enabled: Boolean(userId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<HoldingEvent[]> => {
      if (!userId) return [];
      const { data, error } = await supabase.from('finance_holding_events').select('*')
        .eq('user_id', userId).order('recorded_at', { ascending: false }).order('id', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (last, pages) => last.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
  });
}

/** Full ordered ledger for reconstruction; distinct cache key from the paginated activity list. */
export function useAllHoldingEvents(userId: string | undefined) {
  return useQuery({
    queryKey: [...financeKeys.holdingEvents(userId ?? ''), 'all'],
    enabled: Boolean(userId),
    queryFn: async (): Promise<HoldingEvent[]> => {
      if (!userId) return [];
      const records: HoldingEvent[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('finance_holding_events').select('*').eq('user_id', userId)
          .order('recorded_at').order('id').range(offset, offset + 499);
        if (error) throw error;
        records.push(...(data ?? []));
        if (!data || data.length < 500) return records;
      }
    },
  });
}
