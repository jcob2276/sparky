import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useHaptics } from '../../../hooks/useHaptics';
import { useDailyStrainOura } from '../../../lib/biometricsApi';
import { getTodayWarsaw } from '../../../lib/date';
import { biometricsKeys } from '../../../lib/queryKeys';
import { useUserId } from '../../../store/useStore';
import { useDailyStrainRefresh } from './useDailyStrainRefresh';

export function useDailyStrainCardData(refreshSignal: number) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const haptics = useHaptics();
  const { refreshing, refresh } = useDailyStrainRefresh(userId, queryClient, haptics);
  const dailyQuery = useDailyStrainOura(userId ?? '');
  const today = getTodayWarsaw();
  const rowDate = dailyQuery.data?.row?.date;
  const attempts = useRef(new Set<string>());

  useEffect(() => {
    if (!refreshSignal || !userId) return;
    void queryClient.invalidateQueries({ queryKey: biometricsKeys.dailyStrainOura(userId) });
  }, [refreshSignal, queryClient, userId]);

  useEffect(() => {
    if (!userId || !rowDate || refreshing || rowDate === today) return;
    const attempt = `${userId}:${today}`;
    if (attempts.current.has(attempt)) return;
    attempts.current.add(attempt);
    const storageKey = `sparky_strain_auto_synced_${userId}`;
    try {
      if (localStorage.getItem(storageKey) === today) return;
      localStorage.setItem(storageKey, today);
    } catch { /* The in-memory guard still prevents repeated automatic requests. */ }
    console.debug('[DailyStrainCard] Data stale, running one-shot silent background sync');
    void refresh(true);
  }, [rowDate, userId, today, refreshing, refresh]);

  return { userId, today, dailyQuery, refreshing, refresh };
}
