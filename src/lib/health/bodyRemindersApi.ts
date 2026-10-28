import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { getTodayWarsaw, shiftDateStr } from '../date';
import { mergeBodyMetricSavePayload } from './bodyMetrics';
import { upsertBodyMetrics } from './bodyMetricsApi';
import { bodyReminders, type BodyReminderRow } from './bodyReminders';
import { BODY_REMINDERS_KEY as KEY, invalidateBodyMetricsConsumers } from './bodyMetricsCache';
import type { TablesInsert } from '../database.types';

const HISTORY_DAYS = 120;
export type BodyEntryInput = Record<'weight' | 'waist' | 'neck' | 'chest' | 'belly' | 'hips' | 'thigh' | 'biceps_l' | 'calf', string>;

const num = (value: unknown): number | null => (value == null || value === '' || Number.isNaN(Number(value)) ? null : Number(value));

async function fetchRows(userId: string): Promise<BodyReminderRow[]> {
  const since = shiftDateStr(getTodayWarsaw(), -HISTORY_DAYS);
  const { data, error } = await supabase
    .from('body_metrics')
    .select('date, weight, waist, neck, chest, belly, hips, thigh, biceps_l, calf')
    .eq('user_id', userId)
    .gte('date', since)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).flatMap((r) => (r.date ? [{
    date: r.date, weight: num(r.weight), waist: num(r.waist), neck: num(r.neck), chest: num(r.chest),
    belly: num(r.belly), hips: num(r.hips), thigh: num(r.thigh), biceps_l: num(r.biceps_l), calf: num(r.calf),
  }] : []));
}

/** Przypomnienia o pomiarach (waga co 3 dni, obwody co 3 tygodnie) liczone z historii `body_metrics`. */
export function useBodyReminders(userId: string | undefined) {
  const query = useQuery({ queryKey: [KEY, userId], enabled: Boolean(userId), staleTime: 60_000, queryFn: () => fetchRows(userId as string) });
  const today = getTodayWarsaw();
  const reminders = useMemo(() => (query.data ? bodyReminders(query.data, today) : []), [query.data, today]);
  return { reminders, rows: query.data ?? [], loading: query.isLoading };
}

export function useSaveBodyEntry(userId: string | undefined, rows: BodyReminderRow[]) {
  const queryClient = useQueryClient();
  return async (input: BodyEntryInput): Promise<boolean> => {
    if (!userId) return false;
    const today = getTodayWarsaw();
    const payload = mergeBodyMetricSavePayload(today, userId, rows.find((r) => r.date === today) ?? null, input);
    if (!payload) return false;
    await upsertBodyMetrics(payload as TablesInsert<'body_metrics'>);
    await invalidateBodyMetricsConsumers(queryClient, userId);
    return true;
  };
}
