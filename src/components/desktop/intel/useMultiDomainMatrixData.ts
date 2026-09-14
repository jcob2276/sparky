import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';
import { fetchMultiDomainMatrixApi } from '../../../lib/multiDomainMatrixApi';
import type { DesktopSessionRow, StravaActivityRow } from '../../../lib/desktopDashboardTypes';
import type { LenieLogRow } from '../desktopUtils';
import type { HabitRow } from '../shell/useDesktopData';
import type { MatrixLayerId } from './multiDomainMatrixTypes';
import {
  MATRIX_LAYERS,
  DEFAULT_ACTIVE_LAYERS,
} from './multiDomainMatrixLayers';
import { buildMatrixWeeksAndStats } from './multiDomainMatrixHelpers';

export { MATRIX_LAYERS };

interface UseMultiDomainMatrixDataParams {
  userId?: string;
  sessions: DesktopSessionRow[];
  strava: StravaActivityRow[];
  lenieLogs: LenieLogRow[];
  habits: HabitRow[];
  proteinFloorG?: number;
}

export function useMultiDomainMatrixData({
  userId,
  sessions,
  strava,
  lenieLogs,
  habits,
  proteinFloorG = 140,
}: UseMultiDomainMatrixDataParams) {
  const [selectedLayers, setSelectedLayers] = useState<Set<MatrixLayerId>>(
    new Set(DEFAULT_ACTIVE_LAYERS)
  );

  const todayStr = getTodayWarsaw();
  const dow = new Date(todayStr + 'T12:00:00Z').getUTCDay();
  const offsetToMonday = -(dow === 0 ? 6 : dow - 1);
  const mondayStr = shiftDateStr(todayStr, offsetToMonday);
  const startStr = shiftDateStr(mondayStr, -12 * 7);

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['multi-domain-matrix-api', userId, startStr],
    queryFn: () => (userId ? fetchMultiDomainMatrixApi(userId, startStr) : null),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const toggleLayer = (layerId: MatrixLayerId) => {
    setSelectedLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedLayers(new Set(MATRIX_LAYERS.map(l => l.id)));
  };

  const clearAll = () => {
    setSelectedLayers(new Set());
  };

  const { weeks, stats } = useMemo(() => {
    return buildMatrixWeeksAndStats({
      sessions,
      strava,
      lenieLogs,
      habits,
      apiData,
      proteinFloorG,
      todayStr,
      startStr,
    });
  }, [sessions, strava, lenieLogs, habits, apiData, proteinFloorG, todayStr, startStr]);

  return {
    weeks,
    stats,
    isLoading,
    selectedLayers,
    toggleLayer,
    selectAll,
    clearAll,
  };
}
