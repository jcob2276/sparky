import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { isOfflineError, queueOfflineWrite } from '../offlineQueue';
import {
  fetchSupplements,
  fetchSupplementLogsSince,
  type SupplementLog,
} from './supplementsClient';
import { supplementLoggedAtForDate } from './supplementLogTime';

export const supplementsKeys = {
  all: ['supplements'] as const,
  list: (userId: string) => [...supplementsKeys.all, 'list', userId] as const,
  logs: (userId: string, sinceDate: string) => [...supplementsKeys.all, 'logs', userId, sinceDate] as const,
};

// ── QUERIES ──

export function useSupplements(userId: string) {
  return useQuery({
    queryKey: supplementsKeys.list(userId),
    queryFn: () => fetchSupplements(userId),
    enabled: !!userId,
  });
}

export function useSupplementLogs(userId: string, sinceDate: string) {
  return useQuery({
    queryKey: supplementsKeys.logs(userId, sinceDate),
    queryFn: () => fetchSupplementLogsSince(userId, sinceDate),
    enabled: !!userId && !!sinceDate,
    // Telegram writes outside this QueryClient; mounted views must re-read the log.
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always',
  });
}

// ── MUTATIONS ──

export function useToggleSupplement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      supplementId,
      date,
      sinceDate: _sinceDate,
      existingLog,
    }: {
      userId: string;
      supplementId: string;
      date: string;
      sinceDate: string;
      existingLog?: SupplementLog | null;
    }) => {
      if (existingLog) {
        try {
          const { error } = await supabase
            .from('supplement_logs')
            .delete()
            .eq('user_id', userId)
            .eq('supplement_id', supplementId)
            .eq('date', date);
          if (error) throw error;
        } catch (err: unknown) {
          if (!isOfflineError(err)) throw err;
          await queueOfflineWrite(
            'table:delete:supplement_logs',
            { match: { user_id: userId, supplement_id: supplementId, date } },
            'Odznaczenie suplementu'
          );
        }
        return { deletedLogId: existingLog.id };
      } else {
        const logged_at = supplementLoggedAtForDate(date);
        const payload = {
          user_id: userId,
          supplement_id: supplementId,
          quantity: 1,
          date,
          logged_at,
        };
        let newLog: SupplementLog;
        try {
          const { data, error } = await supabase
            .from('supplement_logs')
            .insert(payload)
            .select()
            .single();
          if (error) throw error;
          newLog = data;
        } catch (err: unknown) {
          if (!isOfflineError(err)) throw err;
          newLog = { id: crypto.randomUUID(), note: null, ...payload };
          await queueOfflineWrite('table:insert:supplement_logs', { payload: newLog }, 'Zaznaczenie suplementu');
        }
        return { newLog };
      }
    },
    onSuccess: (result, variables) => {
      queryClient.setQueryData<SupplementLog[]>(
        supplementsKeys.logs(variables.userId, variables.sinceDate),
        (old) => {
          const base = old || [];
          if (result.deletedLogId) {
            return base.filter((l) => l.id !== result.deletedLogId);
          }
          if (result.newLog) {
            return [result.newLog, ...base];
          }
          return base;
        }
      );
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: supplementsKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['oura-day-night', variables.userId] });
    },
  });
}

/** Ustawia liczbę porcji danego dnia: aktualizuje istniejący wpis albo tworzy nowy. */
export function useSetSupplementQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      supplementId,
      date,
      quantity,
      existingLog,
    }: {
      userId: string;
      supplementId: string;
      date: string;
      quantity: number;
      existingLog?: SupplementLog | null;
    }) => {
      if (existingLog) {
        try {
          const { error } = await supabase.from('supplement_logs').update({ quantity }).eq('id', existingLog.id).eq('user_id', userId);
          if (error) throw error;
        } catch (err: unknown) {
          if (!isOfflineError(err)) throw err;
          await queueOfflineWrite('table:update:supplement_logs', { match: { id: existingLog.id, user_id: userId }, payload: { quantity } }, 'Zmiana liczby suplementu');
        }
        return { ...existingLog, quantity };
      }
      const logged_at = supplementLoggedAtForDate(date);
      const payload = { user_id: userId, supplement_id: supplementId, quantity, date, logged_at };
      try {
        const { data, error } = await supabase.from('supplement_logs').insert(payload).select().single();
        if (error) throw error;
        return data as SupplementLog;
      } catch (err: unknown) {
        if (!isOfflineError(err)) throw err;
        const local: SupplementLog = { id: crypto.randomUUID(), note: null, ...payload };
        await queueOfflineWrite('table:insert:supplement_logs', { payload: local }, 'Zaznaczenie suplementu');
        return local;
      }
    },
    onSuccess: (log, variables) => {
      queryClient.setQueryData<SupplementLog[]>(supplementsKeys.logs(variables.userId, variables.date), (old) => [
        log,
        ...(old ?? []).filter((l) => l.id !== log.id),
      ]);
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: supplementsKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['oura-day-night', variables.userId] });
    },
  });
}
