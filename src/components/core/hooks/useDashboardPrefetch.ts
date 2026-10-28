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
/** Runs `task` when the main thread is idle (falls back to a timer where requestIdleCallback is missing). */
function whenIdle(task: () => void, delayMs: number): () => void {
  let idleId: number | null = null;
  const timer = window.setTimeout(() => {
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(task, { timeout: 4000 });
    } else {
      task();
    }
  }, delayMs);
  return () => {
    window.clearTimeout(timer);
    if (idleId != null && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
  };
}

/** The desktop shell is only used on wide screens; phones must not download it or its data. */
const DESKTOP_MIN_WIDTH = 1024;

function isDesktopViewport(): boolean {
  return window.innerWidth >= DESKTOP_MIN_WIDTH;
}

type NetworkInformationLike = { saveData?: boolean; effectiveType?: string };

/** Tryb oszczędzania danych albo wolne łącze: rozgrzewanie w tle tylko by zabrało pasmo realnym działaniom. */
export function isConstrainedConnection(connection: NetworkInformationLike | undefined): boolean {
  if (!connection) return false;
  return connection.saveData === true || ['slow-2g', '2g', '3g'].includes(connection.effectiveType ?? '');
}

export function useDashboardPrefetch(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    if (isConstrainedConnection((navigator as Navigator & { connection?: NetworkInformationLike }).connection)) return;

    // Stage 1: the other dashboard tabs (their code only) and the two busiest workspace tools.
    const cancelStage1 = whenIdle(() => {
      void import('../DashboardTydzienTab');
      void import('../DashboardHistoriaTab');
      void prefetchCalendarData(queryClient, userId);
      void prefetchTodoData(queryClient, userId);
    }, 600);

    // Stage 2: secondary tools, then the desktop dashboard on wide screens only.
    const cancelStage2 = whenIdle(() => {
      void import('../DashboardProjektyTab');
      void prefetchKeepData(queryClient, userId);
      void prefetchTerminyData(queryClient, userId);
      if (!isDesktopViewport()) return;
      void import('../../desktop/shell/DesktopDashboard');
      void queryClient.prefetchQuery({
        queryKey: desktopKeys.dashboard(userId),
        queryFn: () => fetchDesktopDashboardData(userId),
        staleTime: 1000 * 60 * 5,
      });
    }, 2500);

    return () => {
      cancelStage1();
      cancelStage2();
    };
  }, [userId]);
}
