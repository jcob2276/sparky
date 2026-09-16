import { useEffect } from 'react';
import { queryClient } from '../../../lib/queryClient';
import { desktopKeys } from '../../../lib/queryKeys';
import { fetchDesktopDashboardData } from '../../../lib/desktopDashboardApi';
import {
  prefetchCalendarData,
  prefetchTodoData,
  prefetchKeepData,
  prefetchTerminyData,
} from '../../../lib/workspacePrefetch';

/**
 * Progressively warms up Workspace modules and queries in the background
 * after the main dashboard has settled. Guarantees near-instant transitions
 * to /kalendarz, /todo, /keep, /terminy, and /dashboard.
 */
export function useDashboardPrefetch(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    // Stage 1: High-priority workspace tools (Kalendarz & To Do)
    const stage1Timer = window.setTimeout(() => {
      void prefetchCalendarData(queryClient, userId);
      void prefetchTodoData(queryClient, userId);
    }, 600);

    // Stage 2: Secondary tools & desktop dashboard
    const stage2Timer = window.setTimeout(() => {
      void prefetchKeepData(queryClient, userId);
      void prefetchTerminyData(queryClient, userId);
      void import('../../desktop/shell/DesktopDashboard');
      void queryClient.prefetchQuery({
        queryKey: desktopKeys.dashboard(userId),
        queryFn: () => fetchDesktopDashboardData(userId),
        staleTime: 1000 * 60 * 5,
      });
    }, 1600);

    return () => {
      window.clearTimeout(stage1Timer);
      window.clearTimeout(stage2Timer);
    };
  }, [userId]);
}
