import { useEffect } from 'react';
import { queryClient } from '../../../lib/queryClient';
import { desktopKeys } from '../../../lib/queryKeys';
import { fetchDesktopDashboardData } from '../../../lib/desktopDashboardApi';

/**
 * Silently warms up DesktopDashboard JS bundle and RPC query cache in the background
 * after the main mobile dashboard has settled. This guarantees 0ms navigation
 * when user transitions from /dzis to /dashboard.
 */
export function useDashboardPrefetch(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const timer = window.setTimeout(() => {
      void import('../../desktop/shell/DesktopDashboard');
      void queryClient.prefetchQuery({
        queryKey: desktopKeys.dashboard(userId),
        queryFn: () => fetchDesktopDashboardData(userId),
        staleTime: 1000 * 60 * 5,
      });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [userId]);
}
