import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { TIMEOUTS } from './constants';
import { invokeEdge } from './supabase';
import type { WeekAiInsightResponse } from './edgeTypes';
import { isWeekAiInsightResponse, loadInsight, saveInsight } from './aiInsightStore';

const CACHE_PREFIX = 'week-ai-insight';

function cacheKey(userId: string, today: string): string {
  return `${CACHE_PREFIX}:${userId}:${today}`;
}

/** The analysis is kept per day in this browser (and on the account, see aiInsightStore): opening the tab must not call the model again. */
function readCache(userId: string, today: string): WeekAiInsightResponse | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId, today));
    return raw ? (JSON.parse(raw) as WeekAiInsightResponse) : null;
  } catch {
    return null;
  }
}

function writeCache(userId: string, today: string, value: WeekAiInsightResponse): void {
  try {
    localStorage.setItem(cacheKey(userId, today), JSON.stringify(value));
  } catch {
    /* storage unavailable: the result still shows for this session */
  }
}

/** A function that is not deployed yet answers 404 / "not found"; say that plainly instead of a raw error. */
export function describeWeekInsightError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/not found|404|failed to send a request/i.test(message)) {
    return 'Analiza AI nie jest jeszcze dostępna. Spróbuj później.';
  }
  return message || 'Nie udało się przeanalizować tygodnia.';
}

export function useWeekAiInsight(userId: string | undefined, today: string) {
  const [result, setResult] = useState<WeekAiInsightResponse | null>(() => (userId ? readCache(userId, today) : null));

  const mutation = useMutation({
    mutationFn: () =>
      invokeEdge('week-insight', {
        body: { userId, today },
        signal: AbortSignal.timeout(TIMEOUTS.llm),
      }),
    onSuccess: (data) => {
      setResult(data);
      if (userId) {
        writeCache(userId, today, data);
        void saveInsight(userId, 'week-insight', today, data).catch(() => undefined);
      }
    },
  });

  const stored = useQuery({
    queryKey: ['ai-insight', 'week-insight', userId, today],
    enabled: Boolean(userId && !result),
    staleTime: Infinity,
    queryFn: async () => {
      const saved = await loadInsight(userId as string, 'week-insight', today);
      return isWeekAiInsightResponse(saved) ? saved : null;
    },
  });

  const generate = useCallback(() => {
    if (userId && !mutation.isPending) mutation.mutate();
  }, [userId, mutation]);

  return {
    result: result ?? stored.data ?? null,
    generate,
    loading: mutation.isPending,
    error: mutation.isError ? describeWeekInsightError(mutation.error) : null,
  };
}
