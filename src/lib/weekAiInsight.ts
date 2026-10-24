import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TIMEOUTS } from './constants';
import { invokeEdge } from './supabase';
import type { WeekAiInsightResponse } from './edgeTypes';

const CACHE_PREFIX = 'week-ai-insight';

function cacheKey(userId: string, today: string): string {
  return `${CACHE_PREFIX}:${userId}:${today}`;
}

/** The analysis is kept per day in this browser: opening the tab must not call the model again. */
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
      if (userId) writeCache(userId, today, data);
    },
  });

  const generate = useCallback(() => {
    if (userId && !mutation.isPending) mutation.mutate();
  }, [userId, mutation]);

  return {
    result,
    generate,
    loading: mutation.isPending,
    error: mutation.isError ? describeWeekInsightError(mutation.error) : null,
  };
}
