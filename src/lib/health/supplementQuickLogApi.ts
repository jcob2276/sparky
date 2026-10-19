import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { isOfflineError, queueOfflineWrite } from '../offlineQueue';
import { supplementsKeys } from './supplementsApi';
import type { SupplementLog } from './supplementsClient';

export type QuickLogAction =
  | { kind: 'log'; log: SupplementLog }
  | { kind: 'unlog'; logId: string; supplementId: string };

/** Buduje wpis "zażyto TERAZ" z jawnym logged_at (chwila kliknięcia) i id nadanym po stronie klienta. */
export function buildQuickLog(userId: string, supplementId: string, date: string, now: Date = new Date()): SupplementLog {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    supplement_id: supplementId,
    quantity: 1,
    date,
    logged_at: now.toISOString(),
    note: null,
  };
}

/**
 * Szybkie zaznaczenie / cofnięcie suplementu: optymistyczne, z rollbackiem,
 * a po zakończeniu odświeża listę suplementów i wykres dzień→noc.
 */
export function useQuickLogSupplement(userId: string, sinceDate: string) {
  const queryClient = useQueryClient();
  const logsKey = supplementsKeys.logs(userId, sinceDate);
  return useMutation({
    mutationFn: async (action: QuickLogAction) => {
      if (action.kind === 'log') {
        try {
          const { error } = await supabase.from('supplement_logs').insert(action.log);
          if (error) throw error;
        } catch (err: unknown) {
          if (!isOfflineError(err)) throw err;
          await queueOfflineWrite('table:insert:supplement_logs', { payload: action.log }, 'Zaznaczenie suplementu');
        }
        return;
      }
      try {
        const { error } = await supabase.from('supplement_logs').delete().eq('user_id', userId).eq('id', action.logId);
        if (error) throw error;
      } catch (err: unknown) {
        if (!isOfflineError(err)) throw err;
        await queueOfflineWrite('table:delete:supplement_logs', { match: { user_id: userId, id: action.logId } }, 'Odznaczenie suplementu');
      }
    },
    onMutate: async (action) => {
      await queryClient.cancelQueries({ queryKey: logsKey });
      const previous = queryClient.getQueryData<SupplementLog[]>(logsKey);
      queryClient.setQueryData<SupplementLog[]>(logsKey, (old) => {
        const base = old ?? [];
        return action.kind === 'log' ? [action.log, ...base] : base.filter((l) => l.id !== action.logId);
      });
      return { previous };
    },
    onError: (_err, _action, context) => {
      queryClient.setQueryData(logsKey, context?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: supplementsKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['oura-day-night', userId] });
    },
  });
}
