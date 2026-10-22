import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTodayWarsaw } from '../../../lib/date';
import { useUserId } from '../../../store/useStore';
import { buildPeriodWindow, type ChroniclePeriod } from '../../../lib/chronicle/periods';
import { fetchCialoRows, fetchDuchRows, fetchKontoRows } from '../../../lib/chronicle/chronicleApi';
import { buildCialoSummary, buildDuchSummary, buildKontoSummary } from '../../../lib/chronicle/summaries';
import type { ChronicleGoal, ChronicleSummaryData } from '../../../lib/chronicle/summaryTypes';

/** Podsumowanie jednej zakładki celu dla wybranego okresu (z poprzednim okresem do porównania). */
export function useChronicle(goal: ChronicleGoal, period: ChroniclePeriod) {
  const userId = useUserId();
  const today = getTodayWarsaw();
  const win = useMemo(() => buildPeriodWindow(period, today), [period, today]);

  const query = useQuery({
    queryKey: ['chronicle', goal, userId ?? '', period, win.start],
    queryFn: async (): Promise<ChronicleSummaryData> => {
      if (goal === 'cialo') return buildCialoSummary(await fetchCialoRows(userId!, win.prevStart, win.end), win);
      if (goal === 'duch') return buildDuchSummary(await fetchDuchRows(userId!, win.prevStart, win.end), win);
      return buildKontoSummary(await fetchKontoRows(userId!, win.prevStart, win.end), win, today);
    },
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: 'always',
  });

  return { summary: query.data ?? null, loading: query.isLoading, error: query.error, window: win };
}
