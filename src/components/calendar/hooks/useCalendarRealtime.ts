import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { calendarKeys } from '../../../lib/queryKeys';
import type { VisibleRange } from './calendarDataHelpers';

/** Returns `fetchEvents` (invalidate visible range) and keeps the calendar in sync via realtime. */
export function useCalendarRealtime(userId: string | undefined, visibleRange: VisibleRange) {
  const queryClient = useQueryClient();

  const fetchEvents = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: calendarKeys.events(userId || '', visibleRange.rangeStart, visibleRange.rangeEnd),
    });
  }, [queryClient, userId, visibleRange]);

  // Real-time updates subscription to keep calendar in sync instantly with database triggers/background sync
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('calendar-realtime-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vanguard_calendar',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void fetchEvents();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, fetchEvents]);

  return fetchEvents;
}
