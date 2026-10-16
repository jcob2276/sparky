import { useCallback, useRef, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { biometricsKeys } from '../../../lib/queryKeys';
import { syncOura, syncStrava, computeDailyStrain } from '../../../lib/syncApi';
import { notify } from '../../../lib/notify';

interface Haptics {
  light: () => void;
  success: () => void;
  error: () => void;
}

export function useDailyStrainRefresh(userId: string | undefined, queryClient: QueryClient, haptics: Haptics) {
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const refresh = useCallback(async (silent = false) => {
    if (inFlight.current || !userId) return;
    inFlight.current = true;
    setRefreshing(true);
    if (!silent) haptics.light();
    try {
      // sync runs enhanced + timeseries internally — one call does all three
      const sources = ['Aktywności', 'Oura'];
      const results = await Promise.allSettled([syncStrava(), syncOura(userId)]);
      const failed = results.flatMap((result, index) => {
        if (result.status !== 'rejected') return [];
        console.warn(`[DailyStrainCard] ${sources[index]} sync failed:`, result.reason);
        return [sources[index]];
      });

      await computeDailyStrain(userId, 2);

      await queryClient.invalidateQueries({ queryKey: biometricsKeys.all });
      if (!silent) {
        if (failed.length) {
          haptics.error();
          notify(`Nie udało się odświeżyć źródeł: ${failed.join(', ')}. Wynik przeliczono z dostępnych danych.`, 'error');
        } else haptics.success();
      }
    } catch (e: unknown) {
      console.error('DailyStrainCard refresh:', e);
      if (!silent) {
        haptics.error();
        notify('Nie udało się odświeżyć danych zdrowia.', 'error');
      }
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [userId, queryClient, haptics]);

  return { refreshing, refresh };
}
