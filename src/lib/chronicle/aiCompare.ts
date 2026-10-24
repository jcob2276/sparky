import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { TIMEOUTS } from '../constants';
import { invokeEdge } from '../supabase';
import type { PeriodCompareResponse } from '../edgeTypes';
import { describeWeekInsightError } from '../weekAiInsight';
import { isPeriodCompareResponse, loadInsight, saveInsight } from '../aiInsightStore';

export interface ComparePeriod {
  label: string;
  start: string;
  end: string;
}

/**
 * Wersja analizy w kluczu zapamiętanego wyniku: podbij ją po każdej zmianie funkcji `period-compare`,
 * inaczej użytkownik przez resztę dnia widzi stary wynik z poprzedniej wersji promptu.
 */
const ANALYSIS_VERSION = 5;
const CACHE_PREFIX = `period-compare-ai:v${ANALYSIS_VERSION}`;

/**
 * Klucz pary okresów plus dzisiejsza data: wynik dla trwającego okresu starzeje się z dnia na dzień,
 * a dla zamkniętych okresów odświeżenie raz dziennie niczego nie psuje.
 */
export function compareCacheKey(userId: string, a: ComparePeriod, b: ComparePeriod, today: string): string {
  return `${CACHE_PREFIX}:${userId}:${a.start}:${a.end}:${b.start}:${b.end}:${today}`;
}

function readCache(key: string): PeriodCompareResponse | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as PeriodCompareResponse) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: PeriodCompareResponse): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the result still shows for this session */
  }
}

/** AI porównuje dwa okresy tylko na żądanie; wynik jest pamiętany w przeglądarce i na koncie dla tej pary okresów i dnia. */
export function usePeriodAiCompare(userId: string | undefined, a: ComparePeriod, b: ComparePeriod, today: string) {
  const key = userId ? compareCacheKey(userId, a, b, today) : null;
  const [fresh, setFresh] = useState<{ key: string; value: PeriodCompareResponse } | null>(null);

  const mutation = useMutation({
    mutationFn: () => invokeEdge('period-compare', { body: { userId, a, b }, signal: AbortSignal.timeout(TIMEOUTS.llm) }),
    onSuccess: (data) => {
      if (!key) return;
      setFresh({ key, value: data });
      writeCache(key, data);
      void saveInsight(userId as string, 'period-compare', key, data).catch(() => undefined);
    },
  });

  const local = key ? readCache(key) : null;
  const stored = useQuery({
    queryKey: ['ai-insight', 'period-compare', key],
    enabled: Boolean(userId && key && !local),
    staleTime: Infinity,
    queryFn: async () => {
      const saved = await loadInsight(userId as string, 'period-compare', key as string);
      return isPeriodCompareResponse(saved) ? saved : null;
    },
  });

  const generate = useCallback(() => {
    if (userId && !mutation.isPending) mutation.mutate();
  }, [userId, mutation]);

  const result = key ? (fresh?.key === key ? fresh.value : (local ?? stored.data ?? null)) : null;
  return {
    result,
    generate,
    loading: mutation.isPending,
    error: mutation.isError ? describeWeekInsightError(mutation.error) : null,
  };
}
