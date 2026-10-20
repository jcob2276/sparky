import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { recordViewEvent } from '../../../lib/dashboardApi';
import { getTodayWarsaw, getWarsawHour } from '../../../lib/date';
import { fetchLastFoodLogDate } from '../../../lib/behavior/behaviorLogClient';
import { STORAGE_KEYS } from '../../../lib/constants';
import { fetchLatestTaskReviewDate } from '../../../lib/todo/todo';
import { getWeekStartWarsaw } from '../../../lib/growth/growth';
import type { useDashboardData } from './useDashboardData';

type TodayWin = ReturnType<typeof useDashboardData>['todayWin'];

/** View event tracking. */
export function useDashboardViewTracking(userId: string | undefined, view: string) {
  // Note: viewEventMutation identity changes on every status transition (idle/pending/success).
  // We store the mutate fn in a ref so the effect below only re-fires when userId or view
  // actually changes, not on every mutation lifecycle tick. This prevents an infinite
  // insert loop into view_events (seen at 87k+ rows when the mutation was in the deps array).
  const viewEventMutation = useMutation({
    mutationFn: async (viewName: string) => {
      if (!userId) return;
      await recordViewEvent(userId, viewName);
    }
  });
  const viewEventMutateRef = useRef(viewEventMutation.mutate);
  useEffect(() => { viewEventMutateRef.current = viewEventMutation.mutate; });

  useEffect(() => {
    if (userId && view) {
      viewEventMutateRef.current(view);
    }
  }, [userId, view]);
}

/** Task review status for the current Warsaw week. */
export function useDashboardTaskReview(
  userId: string | undefined,
  setTaskReviewDoneThisWeek: Dispatch<SetStateAction<boolean>>,
) {
  const { data: latestTaskReviewDate } = useQuery({
    queryKey: ['latest-task-review-date', userId],
    queryFn: () => fetchLatestTaskReviewDate(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (latestTaskReviewDate) {
      setTaskReviewDoneThisWeek(getWeekStartWarsaw(latestTaskReviewDate) === getWeekStartWarsaw(getTodayWarsaw()));
    }
  }, [latestTaskReviewDate, setTaskReviewDoneThisWeek]);
}

/** Auto-suggest Evening Shutdown after 20:00 Warsaw. */
export function useDashboardShutdownSuggestion(
  todayWin: TodayWin,
  setShowShutdown: Dispatch<SetStateAction<boolean>>,
) {
  useEffect(() => {
    if (!todayWin) return;
    if (todayWin.day_note?.trim()) return;
    const today = getTodayWarsaw();
    try {
      if (localStorage.getItem(STORAGE_KEYS.SHUTDOWN_DISMISSED) === today) return;
    } catch (e: unknown) { console.warn('[useDashboardState] Failed to read shutdown dismissed date from localStorage:', e); }
    const warsawHour = getWarsawHour();
    if (warsawHour >= 20) { setTimeout(() => setShowShutdown(true), 0); }
  }, [todayWin, setShowShutdown]);
}

/**
 * Detect a >2 day logging gap and prompt once per gap so it can be labeled
 * rather than silently misread as an event (e.g. a fasting day) by correlations.
 */
export function useDashboardLoggingGap(
  userId: string | undefined,
  setGapLastLoggedDate: Dispatch<SetStateAction<string | null>>,
) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const lastDate = await fetchLastFoodLogDate(userId);
        if (cancelled || !lastDate) return;
        const gapDays = Math.round(
          (new Date(getTodayWarsaw() + 'T12:00:00Z').getTime() - new Date(lastDate + 'T12:00:00Z').getTime())
          / (24 * 60 * 60 * 1000),
        );
        if (gapDays <= 2) return;
        if (localStorage.getItem(STORAGE_KEYS.GAP_PROMPT_DISMISSED_FOR) === lastDate) return;
        setGapLastLoggedDate(lastDate);
      } catch (e: unknown) {
        console.warn('[useDashboardState] Failed to check logging gap:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, setGapLastLoggedDate]);
}
