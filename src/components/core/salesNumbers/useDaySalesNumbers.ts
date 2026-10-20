import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCloserDay, saveCloserDayNumbers } from '../../../lib/closer/closerDayApi';
import {
  EMPTY_DRAFT,
  draftToNumbers,
  rowToDraft,
  type DayNumbersDraft,
} from '../../../lib/closer/closerDayModel';
import { notify } from '../../../lib/notify';
import { closerKeys, goalSpineKeys } from '../../../lib/queryKeys';

/** Stan i zapis liczb sprzedaży jednego dnia (umówieni, rozmowy, sales calle + opinia). */
export function useDaySalesNumbers(userId: string | null | undefined, date: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: closerKeys.day(userId ?? '', date),
    queryFn: () => fetchCloserDay(userId!, date),
    enabled: !!userId,
  });
  const [draft, setDraft] = useState<DayNumbersDraft>(EMPTY_DRAFT);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  if (query.isSuccess && hydratedFor !== date) {
    setHydratedFor(date);
    setDraft(rowToDraft(query.data));
  }

  const numbers = draftToNumbers(draft);
  const mutation = useMutation({
    mutationFn: () => saveCloserDayNumbers(userId!, date, numbers!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: closerKeys.all }),
        queryClient.invalidateQueries({ queryKey: goalSpineKeys.all }),
      ]);
    },
  });

  const save = async (): Promise<boolean> => {
    if (!userId || !numbers) return false;
    try {
      await mutation.mutateAsync();
      return true;
    } catch (err: unknown) {
      console.error('[closer] saving day numbers failed:', err);
      notify('Nie udało się zapisać liczb sprzedaży', 'error');
      return false;
    }
  };

  return {
    row: query.data ?? null,
    loading: query.isLoading,
    loadError: query.error,
    draft,
    setDraft,
    patchDraft: (patch: Partial<DayNumbersDraft>) => setDraft((current) => ({ ...current, ...patch })),
    complete: numbers !== null,
    saving: mutation.isPending,
    save,
  };
}
