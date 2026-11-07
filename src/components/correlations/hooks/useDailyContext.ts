import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserId } from '../../../store/useStore';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';
import { notify } from '../../../lib/notify';
import {
  fetchDailyContext, setDailyContext, type DailyContextKey, type DailyContextRow,
} from '../../../lib/behavior/dailyContextApi';

interface SetVars { date: string; key: DailyContextKey; value: number | null }

export function useDailyContext() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const today = getTodayWarsaw();
  const days = useMemo(() => [today, shiftDateStr(today, -1)], [today]);
  const queryKey = ['daily-context', userId ?? '', today] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchDailyContext(userId as string, days),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: ({ date, key, value }: SetVars) => setDailyContext(userId as string, date, key, value),
    onMutate: async ({ date, key, value }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DailyContextRow[]>(queryKey) ?? [];
      const rest = previous.filter((r) => !(r.date === date && r.behavior_key === key));
      queryClient.setQueryData<DailyContextRow[]>(queryKey, value === null ? rest : [...rest, { date, behavior_key: key, value }]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) queryClient.setQueryData(queryKey, ctx.previous);
      notify('Nie udało się zapisać wpisu', 'error');
    },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey }); },
  });

  const valueFor = (date: string, key: DailyContextKey): number | null =>
    (query.data ?? []).find((r) => r.date === date && r.behavior_key === key)?.value ?? null;

  return { days, today, valueFor, setValue: mutation.mutate, loading: query.isLoading };
}
