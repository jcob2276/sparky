import { useQuery } from '@tanstack/react-query';
import { fetchDayNightTimeline } from '../../../../lib/biometrics/ouraDayTimelineApi';

export function useDayNightTimeline(userId: string, nightDate: string | null) {
  return useQuery({
    queryKey: ['oura-day-night', userId, nightDate],
    queryFn: () => fetchDayNightTimeline(userId, nightDate as string),
    enabled: !!userId && !!nightDate,
    staleTime: 5 * 60 * 1000,
  });
}
