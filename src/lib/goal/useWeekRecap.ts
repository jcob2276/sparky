import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TIMEOUTS } from '../constants';
import { invokeEdge } from '../supabase';
import { reviewCycleKeys } from '../queryKeys';
import type { ReviewContext } from './reviewCycle.types';

type Recap = NonNullable<ReviewContext['aiRecap']>;

/** Brak funkcji lub sieci mówimy po ludzku, zamiast surowego błędu. */
export function describeRecapError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/not found|404|failed to send a request/i.test(message)) {
    return 'Analiza tygodnia nie jest teraz dostępna. Możesz zamknąć tydzień bez niej.';
  }
  return 'Nie udało się przygotować analizy tygodnia. Możesz spróbować jeszcze raz albo zamknąć tydzień bez niej.';
}

/**
 * Pełna analiza tygodnia z funkcji `recap` (sen, telefon, żywienie, trening, poranne cele, oceny i notatki dnia,
 * głosówki, historia tygodni). Zapisuje się w weekly_reviews.ai_recap, więc kolejne otwarcie jej nie liczy od nowa.
 * Gdy nic jeszcze nie zapisano, liczy się sama: formularz nie pokazuje pustego miejsca z przyciskiem.
 */
export function useWeekRecap(
  userId: string,
  weekStart: string,
  stored: ReviewContext['aiRecap'] | undefined,
  contextReady: boolean,
) {
  const queryClient = useQueryClient();
  const autoStarted = useRef(false);

  const mutation = useMutation({
    mutationFn: async (): Promise<Recap> => {
      const response = await invokeEdge('recap', {
        body: { type: 'weekly-recap', phase: 'before', userId, weekStart },
        signal: AbortSignal.timeout(TIMEOUTS.llm),
      });
      if (!('phase1' in response)) throw new Error('Analiza tygodnia zwróciła nieczytelną odpowiedź.');
      return response.phase1;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewCycleKeys.context(userId, `week:${weekStart}`) });
    },
  });

  const { mutate, isPending, isIdle } = mutation;
  const generate = useCallback(() => { if (!isPending) mutate(); }, [isPending, mutate]);

  useEffect(() => {
    if (!contextReady || stored || !isIdle || autoStarted.current) return;
    autoStarted.current = true;
    mutate();
  }, [contextReady, stored, isIdle, mutate]);

  return {
    recap: mutation.data ?? stored ?? null,
    generate,
    loading: !contextReady || isPending || (!stored && isIdle),
    error: mutation.isError ? describeRecapError(mutation.error) : null,
  };
}
