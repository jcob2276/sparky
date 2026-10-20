import { useQuery } from '@tanstack/react-query';
import { biometricsKeys } from '../../queryKeys';
import { computeSleepDrivers } from './engine';
import { fetchSleepDriversInput } from './sleepDriversApi';
import type { UseSleepDriversResult } from './types';

const STALE_MS = 10 * 60 * 1000;

/** Korelacje „co wpływa na sen”: dane z Supabase (jedno zestawienie zapytań) + czysty silnik. */
export function useSleepDrivers(userId: string | null | undefined): UseSleepDriversResult {
  const query = useQuery({
    queryKey: biometricsKeys.sleepDrivers(userId ?? ''),
    queryFn: async () => computeSleepDrivers(await fetchSleepDriversInput(userId ?? '')),
    enabled: !!userId,
    staleTime: STALE_MS,
  });
  return {
    data: query.data ?? null,
    isLoading: !!userId && query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  };
}
