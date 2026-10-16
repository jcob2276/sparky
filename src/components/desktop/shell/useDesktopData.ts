import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDesktopDashboardData, type DesktopQueryResult } from '../../../lib/desktopDashboardApi';
import { desktopKeys } from '../../../lib/queryKeys';

export type { DesktopSessionRow, StravaActivityRow, HabitRow, HabitLogRow } from '../../../lib/desktopDashboardTypes';

export function useDesktopData(userId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery<DesktopQueryResult>({
    queryKey: desktopKeys.dashboard(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      return fetchDesktopDashboardData(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: desktopKeys.dashboard(userId || '') });
  };

  const fallbackData: DesktopQueryResult = {
    oura: [], nutrition: [], sessions: [], body: [], heightCm: null, strain: null,
    strava: [], projects: [], moves: [], goals: null, sprintGoals: [], stream: [],
    patterns: [], wins: [], wiki: [], knowledge: [], lenieLogs: [], phoneUsage: [],
    habits: [], habitLogs: [], marathon: null, personalTargets: null,
  };

  return { ...(query.data ?? fallbackData), loading: query.isLoading, refresh };
}
