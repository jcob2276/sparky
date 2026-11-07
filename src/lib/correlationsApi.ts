import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import type {
  BehaviorEffectResult,
  CorrelationResult,
  CorrelationStats,
} from '@vanguard/domain';

export interface CorrelationsData {
  sourceErrors?: Array<{ source: string; message: string }>;
  correlations: CorrelationResult[];
  behaviors: BehaviorEffectResult[];
  coverage: Record<string, number>;
  stats: CorrelationStats | null;
}

const correlationsKeys = {
  all: ['correlations'] as const,
  forUser: (userId: string, includeWeak: boolean, windowDays: number) =>
    [...correlationsKeys.all, userId, includeWeak, windowDays] as const,
};

/** Domyślne okno skanu korelacji; backend dopuszcza 30-365 dni. */
export const DEFAULT_CORRELATION_WINDOW_DAYS = 90;

async function fetchCorrelationsData(userId: string, includeWeak: boolean, windowDays: number): Promise<CorrelationsData> {
  const payload = { user_id: userId, include_weak: includeWeak, window_days: windowDays };
  const [corrRes, behRes] = await Promise.all([
    supabase.functions.invoke('vanguard-nightly?action=compute-correlations', { body: payload }),
    supabase.functions.invoke('compute-behavior-effects', { body: payload }),
  ]);
  if (corrRes.error || behRes.error) {
    console.warn('[useCorrelationsQuery] Edge function call warning:', corrRes.error || behRes.error);
  }

  return {
    sourceErrors: [
      { source: 'Korelacje', error: corrRes.error },
      { source: 'Wpływ zachowań', error: behRes.error },
    ].flatMap(({ source, error }) => error ? [{ source, message: error.message }] : []),
    correlations: corrRes.data?.results ?? [],
    coverage: corrRes.data?.coverage ?? {},
    stats: corrRes.data?.stats ?? null,
    behaviors: behRes.data?.results ?? [],
  };
}

export function useCorrelationsQuery(
  userId: string | undefined,
  includeWeak: boolean,
  windowDays: number = DEFAULT_CORRELATION_WINDOW_DAYS,
) {
  return useQuery({
    queryKey: correlationsKeys.forUser(userId || '', includeWeak, windowDays),
    queryFn: () => fetchCorrelationsData(userId as string, includeWeak, windowDays),
    enabled: !!userId,
    // compute-correlations to ciężki endpoint przeliczający, nie odczyt — nightly liczy go
    // co noc, więc w ciągu dnia wynik się nie zmienia. Bez staleTime React Query odpalałby
    // przeliczenie przy każdym mount/focus okna (lesson 2026-07-11).
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}
