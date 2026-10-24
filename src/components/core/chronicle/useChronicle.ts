import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTodayWarsaw } from '../../../lib/date';
import { useUserId } from '../../../store/useStore';
import { buildComparisonWindow, buildPeriodWindow, shiftPeriod, type ChroniclePeriod } from '../../../lib/chronicle/periods';
import { fetchCialoRows, fetchDuchRows, fetchKontoRows } from '../../../lib/chronicle/chronicleApi';
import { buildCialoSummary, buildDuchSummary, buildKontoSummary } from '../../../lib/chronicle/summaries';
import type { ChronicleGoal, ChronicleSummaryData } from '../../../lib/chronicle/summaryTypes';

/**
 * Podsumowanie jednej zakładki celu dla wybranego okresu. `offset` to ile okresów wstecz od bieżącego (0 = bieżący),
 * `compareOffset` wskazuje okres, z którym go zestawiamy (domyślnie poprzedni). Sprint ma stałe granice.
 */
export function useChronicle(goal: ChronicleGoal, period: ChroniclePeriod, offset = 0, compareOffset = 1) {
  const userId = useUserId();
  const today = getTodayWarsaw();
  const win = useMemo(
    () => period === 'sprint'
      ? { ...buildPeriodWindow(period, today), compareLabel: 'poprzedni' }
      : buildComparisonWindow(period, shiftPeriod(period, today, -offset), shiftPeriod(period, today, -compareOffset), today),
    [period, today, offset, compareOffset],
  );
  const from = win.start < win.prevStart ? win.start : win.prevStart;
  const to = win.end > win.prevEnd ? win.end : win.prevEnd;

  const query = useQuery({
    queryKey: ['chronicle', goal, userId ?? '', period, win.start, win.prevStart],
    queryFn: async (): Promise<ChronicleSummaryData> => {
      if (goal === 'cialo') return buildCialoSummary(await fetchCialoRows(userId!, from, to), win);
      if (goal === 'duch') return buildDuchSummary(await fetchDuchRows(userId!, from, to), win);
      return buildKontoSummary(await fetchKontoRows(userId!, from, to), win, today);
    },
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: 'always',
  });

  return { summary: query.data ?? null, loading: query.isLoading, error: query.error, window: win };
}
